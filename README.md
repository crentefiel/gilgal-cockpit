# GILGAL Cockpit

GILGAL Cockpit is a visual control surface for the GILGAL guarded-development protocol.

This initial commit establishes the protected, verifiable STABLE baseline. The functional Cockpit V1 is developed only on `gilgal/candidate/cockpit-v1`.

## Development checks

```powershell
npm.cmd install
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run sentinel:build
npm.cmd run gilgal -- sentinel check
```

The repository pins the official GILGAL reference as a Git submodule under `.gilgal/reference`.

