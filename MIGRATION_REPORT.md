=== GILGAL 0.4 COCKPIT MIGRATION ===

Official GILGAL SHA:
Protocol: 5b8302b16313acd265e483b679cd0ed12821d611
Sentinel reference version: 0.2.0

=== COCKPIT ===

STABLE: 5683e3f315f7b54f7223577f6513457edbd82927
CANDIDATE: c4dca3063ec24e5fa2f9a6ffb4ceddc8d0bb2760
Branch: gilgal/candidate/cockpit-v1

Agent instructions installed:
YES

Reference updated:
YES

Loading fake-data bug:
FIXED

Sentinel exit=1 handling:
FIXED

Human FAIL:
IMPLEMENTED

Generic project metadata:
IMPLEMENTED

Hypothesis Ledger:
IMPLEMENTED

Failure Memory:
IMPLEMENTED

Candidate Families:
IMPLEMENTED

Strategy Exhaustion:
IMPLEMENTED

Comparative Gate:
IMPLEMENTED

=== SINUCA ===

STABLE: 99e83dcedf64673a34367d3e9890901142cd86c7
CANDIDATE: 2bd84bcc366b39be0cea7a135d63c365e6e16a89

Reference 0.4:
YES

Gameplay Human Check:
PENDING

Live GILGAL status:
CURRENT

=== TESTS ===

Cockpit tests:
Typecheck: PASS
Build: PASS
Sentinel: PASS (exit 1 = valid BLOCKED)

Sinuca tests:
Typecheck: PASS
Build: PASS
Sentinel: PASS (exit 1 = valid BLOCKED)

=== CHANGE BUDGET ===

Cockpit:
Files: 10 (limit: 45) - WITHIN BUDGET
Insertions: 577 (limit: 6500) - WITHIN BUDGET
Deletions: 37 (limit: 500) - WITHIN BUDGET
Changed lines: 614 (limit: 7000) - WITHIN BUDGET

Sinuca:
Files: 2 (limit: 30) - WITHIN BUDGET
Insertions: 68 (limit: 5000) - WITHIN BUDGET
Deletions: 42 (limit: 300) - WITHIN BUDGET
Changed lines: 110 (limit: 5200) - WITHIN BUDGET

=== HUMAN CHECK ===

Cockpit visual:
PENDING

Sinuca gameplay:
PENDING

=== FINAL GATE ===

PENDING — required Human Checks are still pending

PROMOTION:
NOT AUTHORIZED

