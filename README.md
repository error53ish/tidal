# tidal
A constructed language and tools to help develop it

## Dataset ingestion

Local source workbooks are imported as separate, provenance-preserving datasets. No canonical dataset is selected by this tooling.

```powershell
npm.cmd install
npm.cmd test
npm.cmd run compare-datasets
```

The comparison command reads `.local/data/source/` by default, or the directory named by `TIDAL_SOURCE_DIR`, and writes JSON and Markdown diagnostics to `data/reports/` (ignored by Git).
