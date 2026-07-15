import { X } from "lucide-react";
import { FC } from "react";
import "./QuickNoteModal.css";

interface QuickNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (note: string) => void;
}

const QuickNoteModal: FC<QuickNoteModalProps> = ({ isOpen, onClose, onSave }) => {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const note = formData.get("note") as string;
    if (note.trim()) {
      onSave(note);
      (e.target as HTMLFormElement).reset();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="quick-note-overlay" onClick={onClose}>
      <div className="quick-note-modal" onClick={(e) => e.stopPropagation()}>
        <div className="quick-note-header">
          <h2>Quick Note</h2>
          <button type="button" onClick={onClose} className="close-button">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="quick-note-form">
          <textarea
            name="note"
            placeholder="What happened? Add key details, timestamps, or observations..."
            className="quick-note-input"
            autoFocus
            required
          />

          <div className="quick-note-actions">
            <button type="button" onClick={onClose} className="cancel-button">
              Cancel
            </button>
            <button type="submit" className="save-button">
              Save Note
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuickNoteModal;
