import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { toast } from "sonner";
import { isJsonParseResponseError } from "@/lib/isJsonParseResponseError";

globalThis.addEventListener("unhandledrejection", (event) => {
	if (!isJsonParseResponseError(event.reason)) return;

	event.preventDefault();
	console.warn("Recovered from unhandled JSON parse response error", event.reason);
	toast.error("Authentication response was incomplete", {
		description: "Please try again. If this keeps happening, wait a moment and retry.",
	});
});

globalThis.addEventListener("error", (event) => {
	const candidateError = (event as ErrorEvent).error ?? event.message;
	if (!isJsonParseResponseError(candidateError)) return;

	event.preventDefault();
	console.warn("Recovered from global JSON parse response error", candidateError);
	toast.error("Authentication response was incomplete", {
		description: "Please try again. If this keeps happening, wait a moment and retry.",
	});
});

createRoot(document.getElementById("root")!).render(<App />);
