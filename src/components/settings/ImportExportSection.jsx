import { useState, useRef } from 'react'
import { Upload, Download, FileText, CheckCircle, AlertCircle, X, Trash2 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useDataImport, useDataExport, useDeleteImport } from '@/hooks/useDataImportExport'
import { useToast } from '@/components/ui/Toast'

export function ImportExportSection() {
  const toast = useToast()
  const fileInputRef = useRef(null)
  const [importResult, setImportResult] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const importMutation = useDataImport()
  const exportMutation = useDataExport()
  const deleteMutation = useDeleteImport()

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    // Validate file type
    if (!file.name.endsWith('.csv')) {
      toast.error('File harus berformat CSV')
      return
    }
    
    try {
      const result = await importMutation.mutateAsync(file)
      setImportResult(result)
      
      if (result.imported > 0) {
        toast.success(`Berhasil mengimpor ${result.imported} transaksi`)
      } else if (result.skippedDuplicate > 0) {
        toast.warning('Semua transaksi sudah ada di database (duplikat)')
      }

      if (result.errors.length > 0) {
        toast.error(`Terjadi ${result.errors.length} error saat mengimpor`)
      }
    } catch (err) {
      toast.error(err.message || 'Gagal mengimpor data')
    } finally {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleExport = async () => {
    try {
      const result = await exportMutation.mutateAsync()
      toast.success(`Berhasil mengekspor ${result.total} transaksi`)
    } catch (err) {
      toast.error(err.message || 'Gagal mengekspor data')
    }
  }

  const clearResult = () => {
    setImportResult(null)
    setConfirmDelete(false)
  }

  const handleDeleteImport = async () => {
    if (!importResult?.importedIds?.length) return
    try {
      const count = await deleteMutation.mutateAsync(importResult.importedIds)
      toast.success(`${count} transaksi hasil import berhasil dihapus`)
      setImportResult(null)
      setConfirmDelete(false)
    } catch (err) {
      toast.error(err.message || 'Gagal menghapus data import')
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4" style={{ color: 'var(--ink-3)' }} />
          <CardTitle>Import & Export Data</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Import Section */}
          <div className="p-4 rounded-xl" style={{ background: 'var(--surface-2)', border: '1px solid var(--line)' }}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#3B82F622' }}>
                <Upload className="w-5 h-5" style={{ color: '#3B82F6' }} />
              </div>
              <div className="flex-1">
                <h4 className="font-medium" style={{ color: 'var(--ink)' }}>Import dari Ollo</h4>
                <p className="text-sm mt-1" style={{ color: 'var(--ink-3)' }}>
                  Impor transaksi dari file CSV Ollo. Dompet dan kategori akan dibuat otomatis jika belum ada.
                </p>
                
                <div className="mt-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="csv-import"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    loading={importMutation.isPending}
                    disabled={importMutation.isPending}
                  >
                    <Upload className="w-4 h-4 mr-1.5" />
                    Pilih File CSV
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Import Result */}
            {importResult && (
              <div className="mt-4 p-3 rounded-lg" style={{ background: 'var(--surface)', border: '1px solid var(--line)' }}>
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-medium text-sm" style={{ color: 'var(--ink)' }}>Hasil Import</h5>
                  <button
                    onClick={clearResult}
                    className="text-gray-400 hover:text-gray-600"
                    aria-label="Hapus hasil import"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="space-y-2">
                  {/* Summary row */}
                  <div className="text-xs text-gray-400 mb-1">
                    Total CSV: <strong>{importResult.totalCsv}</strong> baris
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-gray-700">
                      <strong>{importResult.imported}</strong> transaksi berhasil diimpor
                    </span>
                  </div>

                  {importResult.skippedDuplicate > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <AlertCircle className="w-4 h-4 text-amber-400" />
                      <span className="text-gray-600">
                        <strong>{importResult.skippedDuplicate}</strong> duplikat (sudah ada di database)
                      </span>
                    </div>
                  )}

                  {importResult.systemSkipped > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <AlertCircle className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-500">
                        <strong>{importResult.systemSkipped}</strong> baris SYSTEM dilewati (bukan transaksi nyata)
                      </span>
                    </div>
                  )}

                  {importResult.skippedInvalid > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <AlertCircle className="w-4 h-4 text-red-400" />
                      <span className="text-gray-600">
                        <strong>{importResult.skippedInvalid}</strong> transaksi tidak valid (dompet tidak ditemukan)
                      </span>
                    </div>
                  )}
                  
                  {importResult.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm text-red-600 font-medium">
                        {importResult.errors.length} error terdeteksi:
                      </p>
                      <ul className="mt-1 text-xs text-red-500 space-y-1 max-h-24 overflow-y-auto">
                        {importResult.errors.map((err, idx) => (
                          <li key={idx} className="truncate">• {err}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {importResult.importedIds?.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      {!confirmDelete ? (
                        <button
                          onClick={() => setConfirmDelete(true)}
                          className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Batalkan import ini
                        </button>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-xs text-red-600 font-medium">
                            Hapus {importResult.importedIds.length} transaksi yang baru diimport?
                          </p>
                          <div className="flex gap-2">
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={handleDeleteImport}
                              loading={deleteMutation.isPending}
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-1" />
                              Ya, Hapus
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setConfirmDelete(false)}
                              disabled={deleteMutation.isPending}
                            >
                              Batal
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Export Section */}
          <div className="p-4 rounded-xl" style={{ background: 'var(--surface-2)', border: '1px solid var(--line)' }}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#16A34A22' }}>
                <Download className="w-5 h-5" style={{ color: '#16A34A' }} />
              </div>
              <div className="flex-1">
                <h4 className="font-medium" style={{ color: 'var(--ink)' }}>Export ke CSV</h4>
                <p className="text-sm mt-1" style={{ color: 'var(--ink-3)' }}>
                  Export semua transaksi ke format CSV yang kompatibel dengan Ollo.
                </p>
                
                <div className="mt-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleExport}
                    loading={exportMutation.isPending}
                    disabled={exportMutation.isPending}
                  >
                    <Download className="w-4 h-4 mr-1.5" />
                    Export Data
                  </Button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Format Info */}
          <div className="text-xs" style={{ color: 'var(--ink-3)' }}>
            <p>Format CSV yang didukung:</p>
            <p className="mt-1 font-mono px-2 py-1 rounded inline-block" style={{ background: 'var(--surface-2)' }}>
              Date, Title, Type, Wallet, Destination Wallet, Category, SubCategory, Amount, Currency, Note
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
