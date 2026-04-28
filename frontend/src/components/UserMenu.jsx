import { useEffect, useRef, useState } from "react";
import { useAuth } from "../auth/AuthContext";

export default function UserMenu() {
  const { user, logout, deleteAccount } = useAuth();
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const wrapperRef = useRef(null);

  // Close the dropdown on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const handleKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const handleLogout = () => {
    setOpen(false);
    logout();
  };

  const openConfirm = () => {
    setOpen(false);
    setConfirmText("");
    setError(null);
    setConfirmOpen(true);
  };

  const closeConfirm = () => {
    if (submitting) return;
    setConfirmOpen(false);
  };

  const handleDelete = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await deleteAccount();
      // AuthContext flips status to "anonymous" on success, which
      // unmounts this component and renders <AuthScreen />.
    } catch (err) {
      setError(err?.message || "Failed to delete account");
      setSubmitting(false);
    }
  };

  const canConfirm =
    !submitting && confirmText.trim() === (user?.username || "");

  return (
    <>
      <div className="user-menu" ref={wrapperRef}>
        <button
          type="button"
          className="ghost small user-menu-trigger"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <span className="user-name">{user?.username}</span>
          <span aria-hidden="true" style={{ marginLeft: 6 }}>▾</span>
        </button>

        {open && (
          <div className="user-menu-dropdown" role="menu">
            <button
              type="button"
              role="menuitem"
              className="user-menu-item"
              onClick={handleLogout}
            >
              Logout
            </button>
            <button
              type="button"
              role="menuitem"
              className="user-menu-item danger"
              onClick={openConfirm}
            >
              Delete account
            </button>
          </div>
        )}
      </div>

      {confirmOpen && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeConfirm();
          }}
        >
          <div className="modal" style={{ width: "min(480px, 95%)" }}>
            <div className="rowBetween">
              <h2>Delete account</h2>
              <button
                type="button"
                className="ghost small"
                onClick={closeConfirm}
                disabled={submitting}
              >
                ✕
              </button>
            </div>
            <p className="muted small" style={{ marginTop: 0 }}>
              This permanently deletes your account and all associated data
              (encounters, party, PC box). This cannot be undone.
            </p>
            <label>
              Type <strong>{user?.username}</strong> to confirm
              <input
                type="text"
                autoFocus
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                disabled={submitting}
                style={{ marginTop: 4 }}
              />
            </label>
            {error && (
              <div className="muted small" style={{ color: "#f87171" }}>
                {error}
              </div>
            )}
            <div className="modal-actions">
              <button
                type="button"
                className="ghost"
                onClick={closeConfirm}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn danger"
                onClick={handleDelete}
                disabled={!canConfirm}
              >
                {submitting ? "Deleting…" : "Delete account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
