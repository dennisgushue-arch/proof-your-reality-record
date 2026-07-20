import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type RecordingExitDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export const RecordingExitDialog = ({ open, onOpenChange, onConfirm }: RecordingExitDialogProps) => (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Leave live capture?</AlertDialogTitle>
        <AlertDialogDescription>
          Text and metadata may be saved locally, but pending photos and files are not stored across refreshes. Save the incident or continue editing if you need those files.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Keep editing</AlertDialogCancel>
        <AlertDialogAction onClick={onConfirm}>Leave capture</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
