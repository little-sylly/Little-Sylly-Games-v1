# Fixture — identity-doc harness self-test

NOT a real identity document. Its filename stem is `identity-doc-fixture`, so
no plugin file matches and the JS haystack is empty — every string below is
checked against `index.html` alone, which is where all the real ones come from.
Three blocks: block A is entirely real, block B is entirely invented, block C
exercises comments, blank lines and an entity. Expected: exactly 3 failures,
all from block B.

**Block B's strings must stay wrong forever.** They are the planted failures. If
a future edit to Cookie Jar ever makes one of them real, replace it with a fresh
invention rather than leaving the self-test toothless.

## Block A — every string real

```copy
# screen-cjar-menu
Raid the Jar!
How to Play
Settings
← Back to the Box
```

## Block B — every string invented (3 planted failures)

```copy
Grab The Biscuit Tin
Nibble Quietly Away
Custard Cream Catastrophe
```

## Block C — comments, blanks and an entity

```copy
# screen-cjar-table — comment line, must be skipped

Next from Jar
Left in Jar
what's come out &rsaquo;
```
