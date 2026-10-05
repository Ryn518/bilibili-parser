'use client';

interface Props {
  open: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, message, onConfirm, onCancel }: Props) {
  if (!open) return null;
  return (
    <div className="modal-overlay" style={{ zIndex: 200 }} onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-delete-title"
        className="modal max-w-[360px] text-center"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="confirm-delete-title" className="text-lg font-bold text-ink">
          确认删除
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-text2">{message}</p>
        <div className="mt-5 flex gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-[10px] border border-border py-2.5 text-sm font-semibold text-text2"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-[10px] bg-red-500 py-2.5 text-sm font-semibold text-white"
          >
            删除
          </button>
        </div>
      </div>
    </div>
  );
}
