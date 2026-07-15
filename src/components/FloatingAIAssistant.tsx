import { FC, useState } from "react";
import { Sparkles, X, MessageSquare } from "lucide-react";
import "./FloatingAIAssistant.css";

interface AIAssistantOption {
  id: string;
  label: string;
}

interface FloatingAIAssistantProps {
  options?: AIAssistantOption[];
  onSelectOption?: (optionId: string) => void;
  caseId?: string;
}

const defaultOptions: AIAssistantOption[] = [
  { id: "summarize", label: "Summarize this case" },
  { id: "contradictions", label: "Find contradictions" },
  { id: "timeline", label: "Build timeline" },
  { id: "meeting", label: "Prepare for meeting" },
  { id: "missing", label: "What evidence is missing?" },
  { id: "report", label: "Generate report" },
];

const FloatingAIAssistant: FC<FloatingAIAssistantProps> = ({
  options = defaultOptions,
  onSelectOption,
  caseId,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonTitle = caseId ? "Proof AI for this case" : "Proof AI";

  const handleSelect = (optionId: string) => {
    onSelectOption?.(optionId);
    setIsOpen(false);
  };

  return (
    <div className="floating-ai-assistant">
      {isOpen && (
        <div className="ai-menu">
          <div className="ai-menu-header">
            <h3>Ask Proof AI</h3>
            <button
              type="button"
              className="ai-menu-close"
              onClick={() => setIsOpen(false)}
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
          </div>

          <div className="ai-menu-options">
            {options.map((option) => (
              <button
                key={option.id}
                type="button"
                className="ai-menu-option"
                onClick={() => handleSelect(option.id)}
              >
                <MessageSquare size={16} className="option-icon" />
                <span>{option.label}</span>
              </button>
            ))}
          </div>

          <div className="ai-menu-footer">
            <p className="ai-menu-tip">
              💡 Ask natural questions about your case
            </p>
          </div>
        </div>
      )}

      <button
        type="button"
        className={`ai-button ${isOpen ? "active" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Open Proof AI assistant"
        title={buttonTitle}
      >
        <Sparkles size={20} />
        <span className="ai-button-label">AI</span>
        {!isOpen && <span className="ai-dot-indicator">●</span>}
      </button>
    </div>
  );
};

export default FloatingAIAssistant;
