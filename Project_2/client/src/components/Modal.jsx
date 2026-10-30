import { useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';

// Built on the native <dialog>, which provides the focus trap, Escape handling and backdrop.
export default function Modal({ open, onClose, labelledBy, children }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function handleClick(event) {
    // The dialog's own box is all padding-free content, so a click landing on it is on the backdrop.
    if (event.target === dialogRef.current) onClose();
  }

  return (
    <dialog ref={dialogRef} className="modal" aria-labelledby={labelledBy} onClose={onClose} onClick={handleClick}>
      {open && (
        <div className="modal__panel">
          <button type="button" className="modal__close" aria-label="Close" onClick={onClose}>
            <FontAwesomeIcon icon={faXmark} />
          </button>
          {children}
        </div>
      )}
    </dialog>
  );
}
