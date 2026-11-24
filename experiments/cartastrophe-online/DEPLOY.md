# Test deploy checklist (not done yet)

**Don't deploy without the owner's explicit approval.** The project rule is Workers Free only: no paid plans, no paid
add-ons, no billing changes.

## Manual GitHub Actions release

The only repository deployment path is **Actions → Deploy Cartastrophe Online → Run workflow**. It has no push,
schedule, or pull-request trigger. An account administrator must first inspect account
`3aed6802cc84d155b5f7940960ebd115` in the Cloudflare dashboard and confirm that its Workers plan is **Free**. Then
select the `workers_free_confirmed` checkbox and run the workflow from the intended revision.

The checkbox is a deliberate manual gate, not evidence of a plan: the workflow cannot read billing in every account.
Leaving it unchecked fails before checkout, dependency installation, or any Cloudflare upload. When checked, the
workflow uses the existing `CLOUDFLARE_API_TOKEN` organization secret, runs `npm ci`, rebuilds the generated client and
server simulation, runs `node test/sim-node.mjs`, and runs `wrangler deploy --dry-run` before its only upload step.
It does not create billing products or enable paid features.

After a successful run, open https://multiplayer.thearcadeshelf.com/ (the `workers.dev` address is switched off so it does not show the account name). Open it in two independent browsers or devices,
create and join a room, have both players ready up, complete a short match, and verify rematch and leave/rejoin. Check
that the page and WebSocket room both use the same Worker origin. A failed run or a Free-plan limit is not permission to
retry on a paid plan.

## 1. Check the account is on Workers Free (manual alternative)

1. `npx wrangler login`. A browser window opens to sign in to Cloudflare.
2. `npx wrangler whoami`. This shows the account name and ID. Note which account it is.
3. In the Cloudflare dashboard for that account, open **Workers & Pages → Plans** (or **Manage account → Billing →
   Subscriptions**) and confirm the Workers plan says **Free**, not Paid / Standard.
4. Don't press any upgrade, "Enable Durable Objects (paid)", or purchase buttons. SQLite-backed Durable Objects are
   already included in Free, and this project uses only those (`new_sqlite_classes` in `wrangler.jsonc`).

## 2. Ask for approval

Send the owner the account name/ID from `whoami`, the plan the dashboard shows, and what will be created:

* Worker `cartastrophe-online` on a `*.workers.dev` subdomain
* Durable Object class `Room` (SQLite storage)
* Static asset: `cartastrophe-online.html`

Wait for a clear yes.

## 3. Deploy and test (only after approval)

```
npm run check      # build + wrangler deploy --dry-run: validates config, uploads nothing
# Prefer the Manual GitHub Actions release above. For a local one-off, an owner still needs the same approval.
npx wrangler deploy
```

Open https://multiplayer.thearcadeshelf.com/ on two devices and play a match.

## 4. Remove it afterwards (if wanted)

`npx wrangler delete cartastrophe-online` removes the Worker. Its Durable Object data goes with it.

On Workers Free, hitting a daily limit makes requests fail until the limit resets. It doesn't create a bill.
