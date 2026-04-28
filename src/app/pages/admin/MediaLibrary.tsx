import { useEffect, useMemo, useRef, useState } from 'react';
import { Upload, Search, Grid3x3, List, Trash2, Download, ExternalLink, Copy } from 'lucide-react';
import { useAuth } from '../../context/auth-context';
import { useCms } from '../../context/cms-context';
import { hasMinimumRole } from '../../lib/admin/role-access';
import type { AdminMedia } from '../../lib/admin/cms-state';
import { uploadAdminMediaFile } from '../../lib/api-cms';
import { toast } from '../../lib/notify';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { Button } from '../../components/ui/button';

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

const MAX_IMAGE_WIDTH = 2048;
const MAX_IMAGE_HEIGHT = 2048;

/** Resize an image file to at most MAX_IMAGE_WIDTH×MAX_IMAGE_HEIGHT using canvas,
 * preserving aspect ratio. Returns the original file if the browser doesn't
 * support canvas or if the image is already within bounds. */
async function resizeImageIfNeeded(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const { naturalWidth: w, naturalHeight: h } = img;
      if (w <= MAX_IMAGE_WIDTH && h <= MAX_IMAGE_HEIGHT) {
        resolve(file);
        return;
      }
      const ratio = Math.min(MAX_IMAGE_WIDTH / w, MAX_IMAGE_HEIGHT / h);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(w * ratio);
      canvas.height = Math.round(h * ratio);
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(file); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }
          resolve(new File([blob], file.name, { type: mime, lastModified: file.lastModified }));
        },
        mime,
        0.88,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

function imageDimensions(file: File): Promise<{ width: number; height: number }> {
  if (!file.type.startsWith('image/')) return Promise.resolve({ width: 0, height: 0 });
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth || 0, height: img.naturalHeight || 0 });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ width: 0, height: 0 });
    };
    img.src = url;
  });
}

export default function MediaLibrary() {
  const { state, dispatch } = useCms();
  const { user, accessToken } = useAuth();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'image' | 'other'>('all');
  const [sort, setSort] = useState<'date' | 'name' | 'size'>('date');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const canUploadOrEditAlt = hasMinimumRole(user?.role, 'AUTHOR');
  const canDelete = hasMinimumRole(user?.role, 'EDITOR');

  const filtered = useMemo(() => {
    let list = state.media;
    const s = q.trim().toLowerCase();
    if (s) list = list.filter((m) => m.name.toLowerCase().includes(s) || m.alt.toLowerCase().includes(s));
    if (typeFilter === 'image') list = list.filter((m) => m.mime.startsWith('image/'));
    if (typeFilter === 'other') list = list.filter((m) => !m.mime.startsWith('image/'));
    list = [...list].sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'size') return b.sizeBytes - a.sizeBytes;
      return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
    });
    return list;
  }, [state.media, q, typeFilter, sort]);

  const selected = selectedId ? state.media.find((m) => m.id === selectedId) : null;
  const [altDraft, setAltDraft] = useState('');

  useEffect(() => {
    if (selected) setAltDraft(selected.alt);
  }, [selected?.id, selected?.alt]);

  const totalBytes = state.media.reduce((a, m) => a + m.sizeBytes, 0);

  const onFiles = async (files: FileList | null) => {
    if (!canUploadOrEditAlt) {
      toast.error('Author access is required to upload media.');
      return;
    }
    if (!files?.length) return;
    if (!accessToken) {
      toast.error('Sign in again before uploading media.');
      return;
    }
    setUploading(true);
    try {
      const uploaded: AdminMedia[] = [];
      for (const rawFile of Array.from(files)) {
        const file = await resizeImageIfNeeded(rawFile);
        const dimensions = await imageDimensions(file);
        uploaded.push(await uploadAdminMediaFile(file, accessToken, dimensions));
      }
      const uploadedIds = new Set(uploaded.map((item) => item.id));
      dispatch({ type: 'HYDRATE', payload: { ...state, media: [...uploaded, ...state.media.filter((item) => !uploadedIds.has(item.id))] } });
      toast.success(`${uploaded.length} file(s) uploaded to Cloudflare-ready media storage.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const copyUrl = (url: string) => {
    void navigator.clipboard.writeText(url).then(
      () => toast.success('URL copied.'),
      () => toast.error('Clipboard unavailable.'),
    );
  };

  const saveAlt = () => {
    if (!canUploadOrEditAlt) {
      toast.error('Author access is required to update alt text.');
      return;
    }
    if (!selected) return;
    dispatch({ type: 'MEDIA_UPDATE', item: { ...selected, alt: altDraft } });
    toast.success('Alt text saved.');
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-4 md:px-6 md:py-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {!canUploadOrEditAlt ? <span className="inline-flex rounded-full border border-[#FDE68A] bg-[#FEF3C7] px-3 py-1 text-xs font-semibold text-[#92400E]">Read-only mode</span> : null}
            <span className="inline-flex rounded-full border border-[#E5E7EB] bg-white px-3 py-1 text-xs font-semibold text-[#64748B]">
              {state.media.length} files · {formatBytes(totalBytes)}
            </span>
            <Button
              className="bg-[#194890] font-semibold hover:bg-[#2656A8] sm:w-auto w-full"
              disabled={uploading || !canUploadOrEditAlt}
              onClick={() => inputRef.current?.click()}
            >
              <Upload size={20} className="mr-2" />
              {uploading ? 'Uploading...' : 'Upload Files'}
            </Button>
          </div>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            accept="image/*,.pdf,.doc,.docx"
            onChange={(event) => {
              void onFiles(event.target.files);
              event.target.value = '';
            }}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-sm">
        <div className="border-b border-[#E5E7EB] p-4 md:p-6">
          <div className="flex flex-col items-stretch gap-4 xl:flex-row xl:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" size={18} />
              <input
                type="search"
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder="Search media..."
                className="w-full rounded-lg border border-[#E5E7EB] py-2 pl-10 pr-4"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value as typeof typeFilter)}
                className="rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 text-sm"
              >
                <option value="all">All Media</option>
                <option value="image">Images</option>
                <option value="other">Other</option>
              </select>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as typeof sort)}
                className="rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 text-sm"
              >
                <option value="date">Date Uploaded</option>
                <option value="name">Name</option>
                <option value="size">Size</option>
              </select>
              <div className="flex overflow-hidden rounded-lg border border-[#E5E7EB]">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`p-2 transition ${viewMode === 'grid' ? 'bg-[#F3F4F6]' : 'hover:bg-[#F3F4F6]'}`}
                  aria-label="Grid view"
                >
                  <Grid3x3 size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`p-2 transition ${viewMode === 'list' ? 'bg-[#F3F4F6]' : 'hover:bg-[#F3F4F6]'}`}
                  aria-label="List view"
                >
                  <List size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={!canUploadOrEditAlt}
            className="mb-6 w-full cursor-pointer rounded-lg border-2 border-dashed border-[#E5E7EB] bg-[#FAFAFA] p-12 text-center transition hover:border-[#194890] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Upload className="mx-auto mb-4 text-[#6B7280]" size={48} />
            <h3 className="mb-2 font-bold">Drop files to upload</h3>
            <p className="mb-1 text-sm text-[#6B7280]">or click to browse from your computer</p>
            <p className="text-xs text-[#9CA3AF]">Uploaded to the API media library and Cloudflare R2 when configured</p>
          </button>

          {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
              {filtered.map((item) => (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedId(item.id)}
                  onKeyDown={(event) => (event.key === 'Enter' || event.key === ' ') && setSelectedId(item.id)}
                  className={`cursor-pointer overflow-hidden rounded-lg border transition ${
                    selectedId === item.id ? 'border-[#194890] ring-2 ring-[#194890]' : 'border-[#E5E7EB] hover:border-[#194890]'
                  }`}
                >
                  <div className="flex aspect-square items-center justify-center overflow-hidden bg-[#E5E7EB]">
                    {item.mime.startsWith('image/') ? (
                      <img src={item.url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-sm text-[#6B7280]">File</span>
                    )}
                  </div>
                  <div className="bg-white p-3">
                    <p className="truncate text-sm font-semibold">{item.name}</p>
                    <p className="text-xs text-[#6B7280]">{formatBytes(item.sizeBytes)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#F3F4F6]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-[#6B7280]">Preview</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-[#6B7280]">File Name</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-[#6B7280]">Size</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-[#6B7280]">Dimensions</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-[#6B7280]">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase text-[#6B7280]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {filtered.map((item) => (
                    <tr key={item.id} className="hover:bg-[#F9FAFB]">
                      <td className="px-6 py-4">
                        <button type="button" onClick={() => setSelectedId(item.id)} className="block h-16 w-16 overflow-hidden rounded bg-[#E5E7EB]">
                          {item.mime.startsWith('image/') ? <img src={item.url} alt="" className="h-full w-full object-cover" /> : null}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold">{item.name}</td>
                      <td className="px-6 py-4 text-sm text-[#6B7280]">{formatBytes(item.sizeBytes)}</td>
                      <td className="px-6 py-4 text-sm text-[#6B7280]">
                        {item.width}x{item.height}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#6B7280]">{new Date(item.uploadedAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <a
                            href={item.url}
                            download={item.name}
                            className="inline-flex rounded p-2 transition hover:bg-[#F3F4F6]"
                            title="Download"
                          >
                            <Download size={16} />
                          </a>
                          <button type="button" onClick={() => window.open(item.url, '_blank')} className="rounded p-2 transition hover:bg-[#F3F4F6]" title="Open">
                            <ExternalLink size={16} />
                          </button>
                          {canDelete ? (
                            <button
                              type="button"
                              onClick={() => setDeleteId(item.id)}
                              className="rounded p-2 text-[#DC2626] transition hover:bg-[#FEE2E2]"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E5E7EB] px-6 py-4">
          <p className="text-sm text-[#6B7280]">
            {state.media.length} files - {formatBytes(totalBytes)} total
          </p>
        </div>
      </div>

      {selected && (
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
          <h3 className="mb-4 font-bold">File Details</h3>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <div className="mb-4 flex aspect-video items-center justify-center overflow-hidden rounded-lg bg-[#E5E7EB]">
                {selected.mime.startsWith('image/') ? (
                  <img src={selected.url} alt={selected.alt} className="max-h-64 h-full w-full object-contain" />
                ) : (
                  <span className="text-[#6B7280]">Preview not available</span>
                )}
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold">Alt Text</label>
                <input
                  type="text"
                  value={altDraft}
                  onChange={(event) => setAltDraft(event.target.value)}
                  disabled={!canUploadOrEditAlt}
                  className="w-full rounded-lg border border-[#E5E7EB] px-4 py-2"
                />
                <Button type="button" variant="outline" size="sm" className="mt-2" disabled={!canUploadOrEditAlt} onClick={saveAlt}>
                  Save alt text
                </Button>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold">File URL</label>
                <div className="flex gap-2">
                  <input type="text" value={selected.url.slice(0, 120) + (selected.url.length > 120 ? '...' : '')} readOnly className="flex-1 rounded-lg border border-[#E5E7EB] bg-[#F3F4F6] px-4 py-2 text-xs" />
                  <Button type="button" variant="outline" size="icon" onClick={() => copyUrl(selected.url)} aria-label="Copy URL">
                    <Copy size={16} />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-[#6B7280]">File Type</p>
                  <p className="font-semibold">{selected.mime}</p>
                </div>
                <div>
                  <p className="text-[#6B7280]">Size</p>
                  <p className="font-semibold">{formatBytes(selected.sizeBytes)}</p>
                </div>
                <div>
                  <p className="text-[#6B7280]">Dimensions</p>
                  <p className="font-semibold">
                    {selected.width}x{selected.height}
                  </p>
                </div>
                <div>
                  <p className="text-[#6B7280]">Uploaded</p>
                  <p className="font-semibold">{new Date(selected.uploadedAt).toLocaleString()}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 pt-4">
                <Button type="button" className="bg-[#194890] hover:bg-[#2656A8]" disabled={uploading || !canUploadOrEditAlt} onClick={() => inputRef.current?.click()}>
                  Replace (upload new)
                </Button>
                {canDelete ? (
                  <Button type="button" variant="destructive" onClick={() => setDeleteId(selected.id)}>
                    Delete
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete media?</AlertDialogTitle>
            <AlertDialogDescription>Removes the asset from the library and clears featured image references.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#DC2626] hover:bg-[#B91C1C]"
              onClick={() => {
                if (!canDelete) {
                  toast.error('Editor access is required to delete media.');
                  setDeleteId(null);
                  return;
                }
                if (deleteId) {
                  dispatch({ type: 'MEDIA_DELETE', id: deleteId });
                  if (selectedId === deleteId) setSelectedId(null);
                  toast.success('Media deleted.');
                }
                setDeleteId(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
