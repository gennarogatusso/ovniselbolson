<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep game simulation in game-engine.ts, Canvas drawing in game-renderer.ts, and React input/screens in UfoGame.tsx; this extends the existing engine while keeping both endings testable independently of rendering.
- Resolve Canvas colors from game-scoped CSS tokens and load uploaded art via asset pointers; this preserves theming and keeps uploaded binaries outside the repository.
