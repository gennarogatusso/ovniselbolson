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
- Store cinematic sprite sequences in fixed-size transparent atlas cells sharing a ground anchor, and blend poses in the renderer only; this preserves original proportions without changing simulation timing.
- Initialize the playable AWKA prologue through newIntroState while retaining newState as the original adventure baseline; negative-world placement and the existing camera join both scenes without changing combat or ending coordinates.
- Gate the post-jets chapter on the playable state's chapter flag and retain the baseline ending for isolated regression tests; chapter timing and interactions remain in the engine, with military/world and bedroom/screen drawing in the renderer.
- Keep bedroom collision geometry and proximity interactions in the engine and the night-background latch active until exit; forest continuation uses chapter stages so the original phases, combat and endings stay unchanged.
- Dispatch spaceship rendering before chapter-background selection and preload every ship asset before play; completed forest stages must never override the active ship scene.
