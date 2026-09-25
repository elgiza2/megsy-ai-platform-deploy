import { useEffect, useState } from "react";
import { ArrowLeft, Download, FileQuestion } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { clearFilePreview, readFileForPreview, type FilePreviewPayload } from "@/lib/filePreviewStore";

const textTypes = /^(text\/|application\/json|application\/javascript)/i;
const officeTypes = /word|excel|spreadsheet|presentation|msword|officedocument/i;

export default function FilePreviewPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [file, setFile] = useState<FilePreviewPayload | null>(null);

  useEffect(() => {
    setFile(readFileForPreview(id));
    return () => clearFilePreview(id);
  }, [id]);

  if (!file) {
    return <main className="grid min-h-dvh place-items-center bg-background px-6 text-center text-foreground"><div><FileQuestion className="mx-auto mb-3 h-8 w-8 opacity-60" /><p className="text-sm">Preview not available. Please attach the file again.</p><button className="mt-4 rounded-full bg-foreground px-4 py-2 text-sm text-background" onClick={() => navigate(-1)}>Go back</button></div></main>;
  }

  const type = file.type || "application/octet-stream";
  const image = type.startsWith("image/");
  const pdf = type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  const text = textTypes.test(type) || /\.(txt|md|markdown|csv|json|log|xml|html?)$/i.test(file.name);
  const office = officeTypes.test(type) || /\.(docx?|xlsx?|pptx?)$/i.test(file.name);

  return <main className="flex min-h-dvh flex-col bg-background text-foreground">
    <header className="flex shrink-0 items-center gap-2 border-b border-border/50 px-3 py-2">
      <button className="rounded-lg p-2 hover:bg-accent" aria-label="Back" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></button>
      <h1 className="min-w-0 flex-1 truncate text-center text-sm font-medium">{file.name}</h1>
      <a className="rounded-lg p-2 hover:bg-accent" href={file.url} download={file.name} target="_blank" rel="noreferrer" aria-label="Download"><Download className="h-4 w-4" /></a>
    </header>
    <section className="min-h-0 flex-1 overflow-auto bg-muted/20 p-3">
      {image && <div className="flex min-h-full items-center justify-center"><img src={file.url} alt={file.name} className="max-h-full max-w-full object-contain" /></div>}
      {pdf && <iframe title={file.name} src={file.url} className="h-full min-h-[75vh] w-full border-0 bg-background" />}
      {text && <iframe title={file.name} src={file.url} className="h-full min-h-[75vh] w-full border-0 bg-background" sandbox="allow-same-origin" />}
      {office && <iframe title={file.name} src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(file.url)}`} className="h-full min-h-[75vh] w-full border-0 bg-background" />}
      {!image && !pdf && !text && !office && <div className="flex min-h-[60vh] items-center justify-center text-center text-sm text-muted-foreground">This file type cannot be previewed here. Download it to open it in the appropriate app.</div>}
    </section>
  </main>;
}
