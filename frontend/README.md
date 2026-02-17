# MyMath Frontend (Next.js)

Kid-friendly frontend for the MyMath FastAPI backend.

## Stack
- Next.js (App Router) + TypeScript
- Tailwind CSS
- Client-side fetch to FastAPI

## Backend URL
By default, the app calls:

`http://127.0.0.1:1233`

You can override with:

```bash
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:1233
```

Create `frontend/.env.local` from `frontend/.env.local.example` if needed.

## Run
From the project root:

```bash
cd frontend
npm install
npm run dev
```

Then open:

- [http://localhost:1234](http://localhost:1234)

## User Flows
- Landing: choose Parent or Child mode.
- Parent: create/list/edit child profiles, set curriculum and strict mode, select child.
- Child: pick profile, ask question, generate explanation + video, see last attempts.
- Result: answer, short steps, video playback, practice question, try similar.

## Notes on Backend Compatibility
- This frontend calls `PATCH /children/{child_id}` for edits.
- If the backend does not support PATCH yet, edits are saved locally in the browser so UX still works.
