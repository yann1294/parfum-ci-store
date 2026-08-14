# Branch Isolation And Safe Project Creation

## Why this branch exists

The playbook is intentionally separate from the Parfum CI product documentation. It describes how to create other businesses from the MVP foundation; it is not part of the Parfum CI customer or maintainer release surface.

Current isolation:

```text
develop @ 13d0c60
  └── playbook/store-reproduction-models
        └── docs/store-reproduction-playbook/**
```

Do not open a merge request from this branch into `develop` or `main`. If Parfum CI receives later fixes that the playbook needs, bring those product commits **into this branch** after review. Do not merge the playbook branch in the opposite direction.

## Git limitation

Tracked files belong to commits, not to an abstract “private branch layer.” If a commit containing this directory is merged or cherry-picked, the files will become visible on the destination branch. A `DO_NOT_MERGE` filename, `.gitignore`, `.gitattributes` or CODEOWNERS entry cannot guarantee otherwise.

The reliable controls are:

1. keep the playbook in a dedicated branch;
2. use a dedicated playbook commit;
3. do not merge/cherry-pick that commit into product branches;
4. create derivative stores in separate repositories;
5. verify the destination diff before every merge.

## Recommended commit boundary

Commit the entire playbook as one documentation-only commit, for example:

```text
docs(playbook): add branch-only store reproduction kit
```

That makes it easy to identify and exclude. Future playbook edits should use `docs(playbook): ...` commits only.

Before merging any other commit from this branch, inspect:

```bash
git diff --name-only develop...HEAD
git log --oneline develop..HEAD
```

If `docs/store-reproduction-playbook/` appears in a Parfum CI pull request, stop and remove the playbook commit from that pull request rather than deleting the files in a compensating product commit.

## Create a new store without copying secrets

The safest source snapshot is the tracked application tree at the completed baseline commit. From the Git repository root, export only tracked files:

```bash
mkdir -p /absolute/path/to/new-store
git archive 13d0c60:parfum-ci-store | tar -x -C /absolute/path/to/new-store
cp LICENSE /absolute/path/to/new-store/LICENSE
```

Why this is safer than copying the working directory:

- ignored `.env*` values are not included;
- `node_modules`, `.next`, Playwright state and local backups are not included;
- the source point is reproducible;
- the new application starts from a known, tested commit.

Then create a separate repository:

```bash
cd /absolute/path/to/new-store
git init
git add .
git commit -m "chore: initialize store from verified commerce baseline"
```

Review the proprietary license before giving another person or business access. The current license does not itself grant a third party permission to operate, resell or modify the application; the verified copyright holder must provide the intended written authorization or replacement license.

## Alternative: preserve full history

If the same owner wants full technical history, clone the repository into a new private location and replace the remote. This also copies every historical Parfum CI filename and migration, so use it only when that history is acceptable and no confidential data was ever committed.

At minimum:

1. verify Git history contains no secret;
2. remove the old remote only after recording the intended new remote;
3. rename the repository and package;
4. create a new default branch policy;
5. ensure new CI contains no Parfum CI production secrets;
6. document provenance and licensing.

Do not rewrite the original repository history just to make a derivative cleaner.

## Infrastructure isolation gate

Before starting the derivative application, create or designate:

- a separate Supabase project, initially disposable until launch;
- separate staff Auth users;
- a separate Storage bucket/project boundary;
- a separate Vercel project and environment variables;
- a separate Resend sender/domain or development provider configuration;
- new cron and server secrets;
- an owned canonical domain or documented temporary domain;
- separate backups and a separate E2E target.

Add the derivative production Supabase project reference to its destructive-E2E hard deny. Never replace the Parfum CI hard deny with the new value in this repository.

## Database adaptation strategy

For the first derivative, retain the existing migration history and apply it only to the new empty Supabase project. Add domain changes as forward-only migrations. This is less elegant than a fresh schema but preserves already-tested transaction, RLS, grant and concurrency behavior.

A squashed domain-neutral baseline can be created later only after:

- the derivative behavior is stable;
- equivalent SQL/RLS/concurrency tests pass from an empty database;
- no production project depends on the rewritten history;
- the old migration chain remains archived for audit/recovery.

Never edit the migrations already applied to Parfum CI.

## Keeping the playbook current

When a reusable security or transaction fix lands on `develop`:

1. inspect the exact product commit;
2. switch to `playbook/store-reproduction-models`;
3. merge or cherry-pick only the needed product commit into the playbook branch;
4. resolve documentation drift here;
5. never push the playbook commit back into the Parfum CI release branch.

Record the new source baseline in this directory's README when the playbook intentionally advances.
