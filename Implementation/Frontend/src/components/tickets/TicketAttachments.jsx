import React, { useState, useRef } from 'react';
import {
  Paperclip,
  Upload,
  X,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  uploadTicketAttachment,
  formatFileSize,
  validateAttachment,
} from '../../services/storageService';
import {
  addTicketAttachment,
  addTicketAttachmentsBatch,
  removeTicketAttachment,
} from '../../services/firestoreService';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export default function TicketAttachments({
  ticketId,
  attachments = [],
  readOnly = false,
  onAttachmentAdded,
  onAttachmentRemoved,
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [loadedImages, setLoadedImages] = useState({});
  const [errorMessage, setErrorMessage] = useState(null);
  const [removingId, setRemovingId] = useState(null); // track which attachment is being deleted
  const fileInputRef = useRef(null);

  const getAttachmentUrl = (att) => {
    if (!att) return '';
    if (att.data && att.data.startsWith('data:')) return att.data;
    if (att.url && att.url.startsWith('data:')) return att.url;
    if (att.url && att.url.startsWith('http')) return att.url;
    if (att.url && att.url.startsWith('/')) return `${API_BASE_URL}${att.url}`;
    return att.url || '';
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setErrorMessage(null);

    // Validate all files
    const validFiles = [];
    for (const file of files) {
      const validation = validateAttachment(file);
      if (!validation.valid) {
        setErrorMessage(validation.error);
      } else {
        validFiles.push(file);
      }
    }

    if (!validFiles.length) return;

    try {
      setUploading(true);
      setUploadingCount(validFiles.length);
      setUploadProgress(20);

      // Upload all attachments in parallel simultaneously
      const uploadedMetas = await Promise.all(
        validFiles.map((file) =>
          uploadTicketAttachment(
            ticketId,
            file,
            (progress) => setUploadProgress((prev) => Math.max(prev, progress))
          )
        )
      );

      // Save all attachments together atomically so they appear in one shot
      await addTicketAttachmentsBatch(ticketId, uploadedMetas);
      if (onAttachmentAdded) onAttachmentAdded(uploadedMetas);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to upload attachments.');
    } finally {
      setUploading(false);
      setUploadingCount(0);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = async (att) => {
    const id = att.id || att.url;
    if (!ticketId || !id || removingId) return;
    setRemovingId(id);
    try {
      await removeTicketAttachment(ticketId, id);
      if (onAttachmentRemoved) onAttachmentRemoved(id);
    } catch (err) {
      console.warn('Failed to remove attachment:', err);
      setErrorMessage('Failed to remove attachment. Please try again.');
    } finally {
      setRemovingId(null);
    }
  };

  const isImageFile = (type = '', name = '') => {
    return (
      type.startsWith('image/') ||
      /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(name)
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Paperclip className="w-3.5 h-3.5 text-slate-500" />
          <h4 className="text-xs font-bold text-slate-900">
            Attachments
          </h4>
          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200 shadow-2xs">
            {attachments?.length || 0}
          </span>
        </div>

        {!readOnly && (
          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple
              className="hidden"
              accept="image/*,.pdf,.txt,.doc,.docx,.csv,.json,.log"
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-white border border-slate-200/90 hover:border-brand-electric/50 text-slate-700 hover:text-brand-electric transition-all shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-electric" />
                  <span>Uploading {uploadProgress}%</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5 text-slate-500" />
                  <span>Attach File</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="ml-auto text-rose-400 hover:text-rose-700 p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Attachments List / Skeleton Loading Grid */}
      {(attachments && attachments.length > 0) || uploadingCount > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {attachments.map((att) => {
            const isImg = isImageFile(att.type, att.name);
            const resolvedUrl = getAttachmentUrl(att);
            const key = att.id || att.url;
            const isImgLoaded = loadedImages[key];

            return (
              <div
                key={key}
                className="group relative flex items-center gap-2.5 p-2.5 rounded-xl bg-white border border-slate-200/90 hover:border-slate-300 shadow-2xs hover:shadow-xs transition-all"
              >
                {/* Thumbnail or Icon */}
                <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden relative">
                  {isImg && resolvedUrl ? (
                    <>
                      {!isImgLoaded && (
                        <div className="absolute inset-0 bg-slate-200/80 animate-pulse flex items-center justify-center">
                          <Loader2 className="w-3 h-3 text-slate-400 animate-spin" />
                        </div>
                      )}
                      <img
                        src={resolvedUrl}
                        alt={att.name}
                        onLoad={() => setLoadedImages((prev) => ({ ...prev, [key]: true }))}
                        className={`w-full h-full object-cover transition-opacity duration-200 ${
                          isImgLoaded ? 'opacity-100' : 'opacity-0'
                        }`}
                      />
                    </>
                  ) : (
                    <FileText className="w-4 h-4 text-slate-400" />
                  )}
                </div>

                {/* File Info */}
                <div className="min-w-0 flex-1">
                  <a
                    href={resolvedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-xs font-semibold text-slate-800 hover:text-brand-electric truncate"
                    title={att.name}
                  >
                    {att.name}
                  </a>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                    <span>{formatFileSize(att.size)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <a
                    href={resolvedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={att.name}
                    aria-label="Open or download attachment"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-brand-electric hover:bg-slate-50 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => handleRemove(att)}
                      disabled={removingId === (att.id || att.url)}
                      aria-label="Delete attachment"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {removingId === (att.id || att.url) ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Skeleton placeholders while all attachments load together */}
          {uploadingCount > 0 &&
            Array.from({ length: uploadingCount }).map((_, idx) => (
              <div
                key={`att_skeleton_${idx}`}
                className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50/90 border border-slate-200/80 animate-pulse shadow-2xs"
              >
                <div className="w-9 h-9 rounded-lg bg-slate-200/80 shrink-0 flex items-center justify-center">
                  <Loader2 className="w-4 h-4 animate-spin text-brand-electric" />
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="h-3.5 bg-slate-200 rounded-md w-3/4" />
                  <div className="h-2.5 bg-slate-200/70 rounded-md w-1/3" />
                </div>
              </div>
            ))}
        </div>
      ) : null}
    </div>
  );
}
