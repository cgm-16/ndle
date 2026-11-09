# Release Checklist and Definition of Done

### 8.6 Release acceptance

- [ ] GitHub milestones and labels exist.
- [ ] Every implementation issue includes metadata and dependency IDs.
- [ ] CI is required and green.
- [ ] Exact release commit is deployed.
- [ ] Production URL opens the title screen, offering Daily and Practice.
- [ ] The launch date is set once and matches the shipped daily list.
- [ ] A refreshed daily list ships within a day of being generated, or is regenerated first.
- [ ] A reload mid-Daily resumes at the same row, and a finished Daily shows
      its result until the next table.
- [ ] The daily share text gives the table number, the score against par and
      the production URL, and never the rows.
- [ ] Storage holds only the language and today's daily.
- [ ] Production gameplay makes zero non-origin requests and needs no runtime
      backend call.
- [ ] README matches the shipped behavior.

## 9. Definition of Done

The release is complete only when:

1. every task in the plans is merged in dependency order;
2. every requirement in the traceability matrix has recorded evidence;
3. all master checklists are checked;
4. CI passes on the exact production commit;
5. a production Vercel deployment passes the smoke checklist;
6. the deployed game is fully playable in English and Korean with mouse, touch, and keyboard;
7. no out-of-scope feature or service has been introduced.
