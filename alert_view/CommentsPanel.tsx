"use client";

import { useEffect, useState } from "react";
import {
  addComment,
  deleteComment,
  editComment,
  fetchComments,
} from "@/lib/actions";

interface CommentRow {
  id: string;
  comment: string;
  created_at: string;
  user_id?: string;
  user_name: string;
  user_email: string;
  can_edit?: boolean;
}

export function CommentsPanel({
  predictionId,
  busy,
  setBusy,
  setActionError,
}: {
  predictionId: string;
  busy: boolean;
  setBusy: (v: boolean) => void;
  setActionError: (v: string | undefined) => void;
}) {
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [commentText, setCommentText] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);

  const [editingCommentId, setEditingCommentId] = useState<string | undefined>(
    undefined,
  );
  const [editingText, setEditingText] = useState("");

  const loadComments = async () => {
    setCommentLoading(true);
    const res = await fetchComments(predictionId);
    if (res.ok) setComments(res.data);
    setCommentLoading(false);
  };

  useEffect(() => {
    if (!predictionId) return;

    let cancelled = false;

    (async () => {
      setCommentLoading(true);
      const res = await fetchComments(predictionId);
      if (cancelled) return;

      if (res.ok) setComments(res.data);
      setCommentLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [predictionId]);

  const onSubmitComment = async () => {
    if (busy) return;
    setActionError(undefined);

    const text = commentText.trim();
    if (!text) return;

    setBusy(true);
    const res = await addComment(predictionId, text);
    if (!res.ok) {
      setBusy(false);
      setActionError(res.error);
      return;
    }

    setCommentText("");
    await loadComments();
    setBusy(false);
  };

  const startEdit = (c: CommentRow) => {
    setEditingCommentId(c.id);
    setEditingText(c.comment);
  };

  const cancelEdit = () => {
    setEditingCommentId(undefined);
    setEditingText("");
  };

  const saveEdit = async () => {
    if (busy || editingCommentId === undefined) return;
    setActionError(undefined);

    const text = editingText.trim();
    if (!text) return;

    setBusy(true);
    const res = await editComment(editingCommentId, text);
    if (!res.ok) {
      setBusy(false);
      setActionError(res.error);
      return;
    }

    await loadComments();
    cancelEdit();
    setBusy(false);
  };

  const removeComment = async (commentId: string) => {
    if (busy) return;
    setActionError(undefined);

    setBusy(true);
    const res = await deleteComment(commentId);
    if (!res.ok) {
      setBusy(false);
      setActionError(res.error);
      return;
    }

    await loadComments();
    setBusy(false);
  };

  return (
    <div className="pt-2">
      <h4 className="text-[1.05rem] font-semibold text-[#2b5a7a] mb-2">
        Comments
      </h4>

      <div className="comment-box not-italic text-gray-700">
        {commentLoading ? (
          <div>Loading comments...</div>
        ) : comments.length === 0 ? (
          <div className="text-gray-500 italic">No comments yet.</div>
        ) : (
          <div className="space-y-3">
            {comments.map((c) => (
              <div
                key={c.id}
                className="bg-white rounded-md p-2 border border-gray-200"
              >
                <div className="text-xs text-gray-500 flex items-center justify-between gap-2">
                  <span>
                    {c.user_name} ({c.user_email}) •{" "}
                    {new Date(c.created_at).toLocaleString()}
                  </span>

                  {c.can_edit && (
                    <span className="flex gap-2">
                      <button
                        type="button"
                        className="text-[#2b5a7a] underline text-xs"
                        onClick={() => startEdit(c)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="text-red-700 underline text-xs"
                        onClick={() => removeComment(c.id)}
                      >
                        Delete
                      </button>
                    </span>
                  )}
                </div>

                {editingCommentId === c.id ? (
                  <div className="mt-2 space-y-2">
                    <input
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-gray-300 text-sm outline-none"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        className="px-3 py-2 rounded-md bg-[#3ba99c] text-white text-sm"
                        onClick={saveEdit}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        className="px-3 py-2 rounded-md bg-gray-300 text-gray-900 text-sm"
                        onClick={cancelEdit}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm">{c.comment}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-2 flex gap-2">
        <input
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="Add a comment..."
          className="flex-1 px-3 py-2 rounded-md border border-gray-300 text-sm outline-none"
        />
        <button
          type="button"
          disabled={busy}
          className="px-3 py-2 rounded-md bg-[#3ba99c] text-white text-sm"
          onClick={onSubmitComment}
        >
          Post
        </button>
      </div>
    </div>
  );
}
