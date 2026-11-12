import React, { useState } from 'react';
import {
  FolderArchive,
  Folder,
  File,
  Image as ImageIcon,
  Music,
  Box,
  FileText,
  Plus,
  Download,
  Tag,
  Search,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import { AssetVaultItem, StudioDatabaseState } from '../types';

interface AssetVaultProps {
  state: StudioDatabaseState;
  onSaveAsset: (asset: AssetVaultItem) => void;
  onDeleteAsset: (assetId: string) => void;
  onCreateAsset: (folderPath: string) => void;
}

export const AssetVault: React.FC<AssetVaultProps> = ({
  state,
  onSaveAsset,
  onDeleteAsset,
  onCreateAsset,
}) => {
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [searchTag, setSearchTag] = useState<string>('');
  const [previewAsset, setPreviewAsset] = useState<AssetVaultItem | null>(null);

  // Extract distinct folders
  const folders = React.useMemo(() => {
    const set = new Set<string>();
    state.assets.forEach((a) => set.add(a.folder_path));
    return Array.from(set);
  }, [state.assets]);

  // Filter assets
  const filteredAssets = state.assets.filter((a) => {
    if (selectedFolder !== 'all' && a.folder_path !== selectedFolder) return false;
    if (searchTag.trim() && !a.tags.some((t) => t.toLowerCase().includes(searchTag.toLowerCase()))) {
      return false;
    }
    return true;
  });

  const getFileIcon = (type: AssetVaultItem['file_type']) => {
    switch (type) {
      case 'image':
        return <ImageIcon size={16} className="text-amber-400" />;
      case 'audio':
        return <Music size={16} className="text-emerald-400" />;
      case 'model':
        return <Box size={16} className="text-sky-400" />;
      default:
        return <FileText size={16} className="text-slate-400" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0f1117] border border-[#1e2330] p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <FolderArchive size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Asset & Media Vault (DAM)</h2>
            <p className="text-xs text-slate-400">Digital Asset Management repository with folder hierarchies, versioning & deep links</p>
          </div>
        </div>

        <button
          onClick={() => onCreateAsset(selectedFolder === 'all' ? '/Concept Art' : selectedFolder)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-black font-semibold text-xs"
        >
          <Plus size={14} />
          <span>Upload / Register Asset</span>
        </button>
      </div>

      {/* Main Grid: Folder Tree & Assets View */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Left: Folder Hierarchy & Tag Search */}
        <div className="studio-card p-4 lg:col-span-1 space-y-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Virtual Directory Tree</p>
            <div className="space-y-1">
              <button
                onClick={() => setSelectedFolder('all')}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between ${
                  selectedFolder === 'all' ? 'bg-amber-500 text-black font-semibold' : 'text-slate-300 hover:bg-[#161922]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Folder size={14} />
                  <span>All Directories</span>
                </div>
                <span className="font-mono text-[10px]">{state.assets.length}</span>
              </button>

              {folders.map((f) => {
                const count = state.assets.filter((a) => a.folder_path === f).length;
                return (
                  <button
                    key={f}
                    onClick={() => setSelectedFolder(f)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between ${
                      selectedFolder === f ? 'bg-amber-500 text-black font-semibold' : 'text-slate-300 hover:bg-[#161922]'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Folder size={14} />
                      <span className="truncate">{f}</span>
                    </div>
                    <span className="font-mono text-[10px] ml-1">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filter by Tag */}
          <div className="pt-2 border-t border-[#1e2330]">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Filter by Taxonomy Tag</p>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search tag (e.g. Blueprint)..."
                value={searchTag}
                onChange={(e) => setSearchTag(e.target.value)}
                className="w-full bg-[#161922] border border-[#2a3144] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white outline-none"
              />
            </div>
          </div>
        </div>

        {/* Right: Asset Files Grid */}
        <div className="studio-card p-5 lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Showing {filteredAssets.length} asset files in {selectedFolder}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filteredAssets.map((asset) => (
              <div
                key={asset.id}
                className="rounded-xl bg-[#0b0d13] border border-[#1e2330] hover:border-amber-500/40 p-3 flex flex-col justify-between transition-all group"
              >
                <div>
                  {/* Thumbnail / Preview Area */}
                  {asset.file_type === 'image' ? (
                    <div className="h-32 rounded-lg overflow-hidden mb-2.5 bg-black cursor-pointer" onClick={() => setPreviewAsset(asset)}>
                      <img src={asset.file_url} alt={asset.filename} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    </div>
                  ) : asset.file_type === 'audio' ? (
                    <div className="h-32 rounded-lg bg-[#161922] flex flex-col items-center justify-center p-3 mb-2.5 border border-[#2a3144]">
                      <Music size={28} className="text-emerald-400 mb-2" />
                      <audio src={asset.file_url} controls className="w-full h-7" />
                    </div>
                  ) : (
                    <div className="h-32 rounded-lg bg-[#161922] flex flex-col items-center justify-center mb-2.5 border border-[#2a3144]">
                      {getFileIcon(asset.file_type)}
                      <span className="text-[10px] text-slate-400 mt-2 font-mono uppercase">{asset.file_type}</span>
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="flex items-start justify-between gap-1">
                    <p className="text-xs font-bold text-white truncate" title={asset.filename}>{asset.filename}</p>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      {asset.version}
                    </span>
                  </div>

                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {formatFileSize(asset.file_size_bytes)} • by {asset.uploaded_by}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {asset.tags.map((tag, i) => (
                      <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-[#161922] text-slate-400 border border-[#2a3144]">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Bottom Card Actions */}
                <div className="pt-2.5 mt-2.5 border-t border-[#1e2330] flex items-center justify-between text-xs">
                  <a
                    href={asset.file_url}
                    target="_blank"
                    rel="noreferrer"
                    download={asset.filename}
                    className="text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium text-[11px]"
                  >
                    <Download size={12} />
                    <span>Download</span>
                  </a>
                  <button
                    onClick={() => onDeleteAsset(asset.id)}
                    className="text-slate-500 hover:text-red-400 p-1"
                    title="Delete Asset"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Image Preview Modal */}
      {previewAsset && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setPreviewAsset(null)}
        >
          <div className="max-w-3xl w-full bg-[#0f1117] border border-[#2a3144] rounded-xl p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-2 border-b border-[#1e2330]">
              <h3 className="text-sm font-bold text-white">{previewAsset.filename} ({previewAsset.version})</h3>
              <button onClick={() => setPreviewAsset(null)} className="text-slate-400 hover:text-white text-xs">✕ Close</button>
            </div>
            <img src={previewAsset.file_url} alt={previewAsset.filename} className="w-full max-h-[500px] object-contain rounded-lg bg-black" />
          </div>
        </div>
      )}
    </div>
  );
};
