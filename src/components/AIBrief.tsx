import { FC } from "react";
import { AlertTriangle, CheckCircle2, Clock3, FileText, ArrowRight } from "lucide-react";
import "./AIBrief.css";

interface AIBriefData {
  evidenceCount: number;
  inconsistencyCount: number;
  lastActivityTime: string;
  recommendedAction: string;
  confidence: "high" | "medium" | "low";
}

interface AIBriefProps {
  data: AIBriefData;
  onReview?: () => void;
}

const AIBrief: FC<AIBriefProps> = ({ data, onReview }) => {
  return (
    <div className="ai-brief">
      <div className="ai-brief-header">
        <div className="ai-badge">
          <span className="ai-dot">●</span>
          AI CASE BRIEF
        </div>
      </div>

      <div className="ai-brief-content">
        <div className="ai-brief-section">
          <h3>This case contains:</h3>
          
          <ul className="ai-brief-list">
            <li>
              <FileText size={16} className="icon" />
              <span>{data.evidenceCount} evidence items</span>
            </li>
            
            <li>
              <AlertTriangle size={16} className="icon warning" />
              <span>{data.inconsistencyCount} potential inconsistenc{data.inconsistencyCount === 1 ? "y" : "ies"}</span>
            </li>
            
            <li>
              <Clock3 size={16} className="icon muted" />
              <span className="muted">Last activity {data.lastActivityTime}</span>
            </li>
          </ul>
        </div>

        <div className="ai-brief-divider" />

        <div className="ai-brief-section">
          <h3>Recommended next action:</h3>
          <p className="ai-brief-action">{data.recommendedAction}</p>
          
          <div className="ai-brief-confidence">
            <span className={`confidence-badge confidence-${data.confidence}`}>
              Confidence: {data.confidence.charAt(0).toUpperCase() + data.confidence.slice(1)}
            </span>
          </div>
        </div>

        <button 
          type="button" 
          className="ai-brief-button"
          onClick={onReview}
        >
          Review
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default AIBrief;
