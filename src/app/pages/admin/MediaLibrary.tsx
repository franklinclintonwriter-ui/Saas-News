import { useEffect, useMemo, useRef, useState } from 'react';
import { Upload, Search, Grid3x3, List, Trash2, Download, ExternalLink, Copy } from 'lucide-react';
import { useCms } from '../../context/cms-context';
import { makeId, type AdminMedia } from '../../lib/admin/cms-state';
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

export default function MediaLibrary() {
  const { state, dispatch } = useCms();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'image' | 'other'>('all');
  const [sort, setSort] = useState<'date' | 'name' | 'size'>('date');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const onFiles = (files: FileList | null) => {
    if (!files?.length) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const url = typeof reader.result === 'string' ? reader.result : '';
        const item: AdminMedia = {
          id: makeId(),
          name: file.name,
          alt: file.name.replace(/\.[^.]+$/, ''),
          url,
          mime: file.type || 'application/octet-stream',
          sizeBytes: file.size,
          width: 1200,
          height: 800,
          uploadedAt: new Date().toISOString(),
        };
        dispatch({ type: 'MEDIA_ADD', item });
      };
      reader.readAsDataURL(file);
    });
    toast.success(`${files.length} file(s) uploaded to workspace.`);
  };

  const copyUrl = (url: string) => {
    void navigator.clipboard.writeText(url).then(
      () => toast.success('URL copied.'),
      () => toast.error('Clipboard unavailable.'),
    );
  };

  const saveAlt = () => {
    if (!selected) return;
    dispatch({ type: 'MEDIA_UPDATE', item: { ...selected, alt: altDraft } });
    toast.success('Alt text saved.');
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Media Library</h1>
          <p className="text-sm md:text-base text-[#6B7280]">Upload and manage your images and files</p>
        </div>
        <Button className="bg-[#194890] hover:bg-[#2656A8] font-semibold" onClick={() => inputRef.current?.click()}>
          <Upload size={20} className="mr-2" />
          Upload Files
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          accept="image/*,.pdf,.doc,.docx"
          onChange={(e) => {
            onFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      <div className="bg-white rounded-lg border border-[#E5E7EB] overflow-hidden">
        <div className="p-4 md:p-6 border-b border-[#E5E7EB]">
          <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-4">
            <div className="flex-1 relative min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" size={18} />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search media..."
                className="w-full pl-10 pr-4 py-2 border border-[#E5E7EB] rounded-lg"
              />
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
                className="px-4 py-2 border border-[#E5E7EB] rounded-lg bg-white text-sm"
              >
                <option value="all">All Media</option>
                <option value="image">Images</option>
                <option value="other">Other</option>
              </select>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as typeof sort)}
                className="px-4 py-2 border border-[#E5E7EB] rounded-lg bg-white text-sm"
              >
                <option value="date">Date Uploaded</option>
                <option value="name">Name</option>
                <option value="size">Size</option>
              </select>
              <div className="flex border border-[#E5E7EB] rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`p-2 ${viewMode === 'grid' ? 'bg-[#F3F4F6]' : 'hover:bg-[#F3F4F6]'} transition`}
                  aria-label="Grid view"
                >
                  <Grid3x3 size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`p-2 ${viewMode === 'list' ? 'bg-[#F3F4F6]' : 'hover:bg-[#F3F4F6]'} transition`}
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
            className="w-full border-2 border-dashed border-[#E5E7EB] rounded-lg p-12 text-center mb-6 hover:border-[#194890] transition cursor-pointer bg-[#FAFAFA]"
          >
            <Upload className="mx-auto mb-4 text-[#6B7280]" size={48} />
            <h3 className="font-bold mb-2">Drop files to upload</h3>
            <p className="text-sm text-[#6B7280] mb-1">or click to browse from your computer</p>
            <p className="text-xs text-[#9CA3AF]">Uploaded to the API media library for this workspace</p>
          </button>

          {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filtered.map((item) => (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedId(item.id)}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setSelectedId(item.id)}
                  className={`border rounded-lg overflow-hidden cursor-pointer transition ${
                    selectedId === item.id ? 'border-[#194890] ring-2 ring-[#194890]' : 'border-[#E5E7EB] hover:border-[#194890]'
                  }`}
                >
                  <div className="aspect-square bg-[#E5E7EB] flex items-center justify-center overflow-hidden">
                    {item.mime.startsWith('image/') ? (
                      <img src={item.url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[#6B7280] text-sm">File</span>
                    )}
                  </div>
                  <div className="p-3 bg-white">
                    <p className="text-sm font-semibold truncate">{item.name}</p>
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
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase">Preview</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase">File Name</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase">Size</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase">Dimensions</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#6B7280] uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {filtered.map((item) => (
                    <tr key={item.id} className="hover:bg-[#F9FAFB]">
                      <td className="px-6 py-4">
                        <button type="button" onClick={() => setSelectedId(item.id)} className="w-16 h-16 bg-[#E5E7EB] rounded overflow-hidden block">
                          {item.mime.startsWith('image/') ? (
                            <img src={item.url} alt="" className="w-full h-full object-cover" />
                          ) : null}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold">{item.name}</td>
                      <td className="px-6 py-4 text-sm text-[#6B7280]">{formatBytes(item.sizeBytes)}</td>
                      <td className="px-6 py-4 text-sm text-[#6B7280]">
                        {item.width}×{item.height}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#6B7280]">{new Date(item.uploadedAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <a
                            href={item.url}
                            download={item.name}
                            className="p-2 hover:bg-[#F3F4F6] rounded transition inline-flex"
                            title="Download"
                          >
                            <Download size={16} />
                          </a>
                          <button type="button" onClick={() => window.open(item.url, '_blank')} className="p-2 hover:bg-[#F3F4F6] rounded transition" title="Open">
                            <ExternalLink size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteId(item.id)}
                            className="p-2 hover:bg-[#FEE2E2] text-[#DC2626] rounded transition"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-[#E5E7EB] flex items-center justify-between flex-wrap gap-2">
          <p className="text-sm text-[#6B7280]">
            {state.media.length} files • {formatBytes(totalBytes)} total
          </p>
        </div>
      </div>

      {selected && (
        <div className="mt-6 bg-white rounded-lg border border-[#E5E7EB] p-6">
          <h3 className="font-bold mb-4">File Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="aspect-video bg-[#E5E7EB] rounded-lg mb-4 overflow-hidden flex items-center justify-center">
                {selected.mime.startsWith('image/') ? (
                  <img src={selected.url} alt={selected.alt} className="w-full h-full object-contain max-h-64" />
                ) : (
                  <span className="text-[#6B7280]">Preview not available</span>
                )}
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Alt Text</label>
                <input
                  type="text"
                  value={altDraft}
                  onChange={(e) => setAltDraft(e.target.value)}
                  className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg"
                />
                <Button type="button" variant="outline" size="sm" className="mt-2" onClick={saveAlt}>
                  Save alt text
                </Button>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">File URL</label>
                <div className="flex gap-2">
                  <input type="text" value={selected.url.slice(0, 120) + (selected.url.length > 120 ? '…' : '')} readOnly className="flex-1 px-4 py-2 border border-[#E5E7EB] rounded-lg bg-[#F3F4F6] text-xs" />
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
                    {selected.width}×{selected.height}
                  </p>
                </div>
                <div>
                  <p className="text-[#6B7280]">Uploaded</p>
                  <p className="font-semibold">{new Date(selected.uploadedAt).toLocaleString()}</p>
                </div>
              </div>
              <div className="flex gap-3 pt-4 flex-wrap">
                <Button type="button" className="bg-[#194890] hover:bg-[#2656A8]" onClick={() => inputRef.current?.click()}>
                  Replace (upload new)
                </Button>
                <Button type="button" variant="destructive" onClick={() => setDeleteId(selected.id)}>
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
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
