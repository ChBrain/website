# Why the gate exists (and why it's payback, not cost)

The companion to [BRANCHING.md](BRANCHING.md). That document is the contract —
which branch may touch what, and how the guard enforces it. This one is the
argument: **why** a repo would constrain its own contributors (human, agent, or
bot) this tightly, and why the constraint _pays for itself_ instead of taxing
the work.

## The thesis

> A well-designed gate is not a cost you pay for safety. It is payback: the
> code that comes out the other side is better _because_ it had to pass.

Most guardrails are **defensive** — they block bad output. This one is
**generative** — it forces the work through a cleaner shape, so the output
improves on the way through. A constraint that makes the constrained thing
_produce better_ is a different and rarer animal than one that merely says no.

The fair-print clause: that payback assumes the contributor is capable enough to
_satisfy_ the constraint productively rather than thrash against it. A weak
contributor bounces off a hard gate; a capable one is shaped by it. That's an
argument for the design, not against it — and it's exactly why the gate matters
more, not less, as autonomous agents do more of the work.

## The problem it answers

Two failure modes that prose rules cannot stop:

1. **The coupled change that hides itself.** The classic tell of a change going
   wrong is source and its tests moving together in one diff — a test quietly
   relaxed to admit the new code, reviewed as one unit, rationalized in one
   description. A human reviewer skims it; an agent will happily author it.
2. **The branch that reaches outside its subject.** A change named for one
   thing edits another — a surface fix that also "tidies" the CI config, a
   feature branch that rewrites the shared chassis. Scope creep that no single
   diff looks wrong enough to reject.

Written rules ("don't weaken tests", "keep changes focused") do not survive
contact with either, because the actor that benefits from breaking them is the
same actor asked to follow them. The only rule that holds is one the actor
_cannot_ ignore.

## The three patterns

Detail lives in [BRANCHING.md](BRANCHING.md); the shape is:

1. **Source/test separation.** Source globs and test globs are declared in
   config; a PR that touches both fails the gate. A coupled change _cannot_ land
   as one diff — it must split into a test PR and a source PR, which puts the
   seam in the open where it gets reviewed on its own merits. The agent can't
   weaken a test in the same breath as the code that needed it weakened.
2. **Branch scope (deny-by-default ownership).** Every branch is classified by
   its **name** into a **lane**; each path is locked to the one lane that owns
   it; a branch may touch a path only if it owns it. Layered:
   `architecture → governance → solution`. A surface branch cannot edit the
   gates; a gates branch cannot rewrite the chassis.
3. **The self-governing gate.** The guard's own config sits inside the
   `governance` lane it defines. You cannot weaken the gate from inside a branch
   that needs the gate to pass. The gate guards itself.

## What makes it distinct

The ideas are in the air — deny-by-default for agents, "governance as physical
constraints not prose," scoped permissions. What's uncommon is the _combination_
along three axes:

| Axis            | The common form                                                                    | This gate                                                                              |
| --------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| **Enforcement** | Advisory — rules written in `AGENTS.md` / Markdown for the agent to read           | **Enforced** — a CI check that fails the build, not a request                          |
| **Locus**       | Agent-side — `.claude/settings.json`, Copilot config, per-tool permission profiles | **Repo-side** — the policy lives in the repository and binds _any_ actor               |
| **Surface**     | Runtime — block a dangerous _command_ (e.g. `DROP TABLE`)                          | **Diff-time** — block a dangerous _change shape_ (mixed source/test, out-of-lane edit) |

Agent-side advisory rules fail the moment the actor changes (a different model,
a human in a hurry, a bot). A repo-side, enforced, diff-time gate is **actor-
agnostic**: it judges the change, not the changer.

## The landscape it sits in

The instinct is circulating; the enforced combination is not yet written up.
What exists, and where it stops short:

- **JetBrains "Agentization Cookbook"** — the closest published reasoning:
  governance as physical constraints, `AGENTS.md` as policy, branch protection,
  CODEOWNERS, "stop conditions." But the stop conditions are _advisory Markdown_
  for the agent to read, not a machine-checked path-per-lane config.
  <https://www.jetbrains.com/help/air/agentization-cookbook.html>
- **Permission-loop / run-ledger write-ups** (Developers Digest) — a per-action
  `allow / ask / deny` manifest with a reviewable run ledger. Per _action_, not
  per _branch_; no path-ownership from branch naming. Complementary, at runtime.
  <https://www.developersdigest.tech/blog/permissions-logs-rollback-ai-coding-agents>
- **Deny-by-default discourse** (r/devops, r/AI_Agents) — the right mental model
  ("the default should be deny; the agent cannot self-authorize its most
  dangerous actions") stated as principle, not tooled into a shared config.
- **Policy-as-code for CI/CD** (hoop.dev and similar) — runtime command
  guardrails. Sits _below_ this gate: they police commands, this polices diffs.

The gap, precisely: nobody has published the **enforced + repo-side + diff-time +
self-governing** combination. Not because it's strange to want — because it's
hard to build, and because the payback only shows up once it's _enforced_.
Advisory rules have no payback; they're ignored exactly when it counts.

## Why all three together

Each pattern alone has a hole the others close:

- Source/test separation without branch scope: an actor can still smuggle scope
  creep into an in-bounds diff.
- Branch scope without a self-governing config: an actor edits the lane
  definitions to widen its own lane.
- A self-governing gate without source/test separation: the config is safe but
  the tests aren't.

Together they form a closed system: you cannot weaken the tests, widen your
scope, _or_ rewrite the rules — not within the work the rules apply to. The
honesty is structural, not promised.

## When _not_ to reach for this

Honesty cuts both ways. This rigor is proportionate to a specific situation:
**multiple autonomous contributors (agents especially) doing frequent,
independent changes across a shared codebase.** For a solo human on a single
repo it is overhead without a matching threat. The test is simple: _is the gate
still catching changes a careful reviewer would have missed?_ While it is, it's
payback. The day it's pure ceremony, simplify it.

---

_The mechanism is the shared `@chbrain/khai-guard` package; the policy is each
repo's `khai-guard.config.json`. See [BRANCHING.md](BRANCHING.md) for this
repo's lanes._
