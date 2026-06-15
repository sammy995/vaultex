"""Import-hygiene guard.

The auth, session, routing, and crypto layers must import without the heavy
Presidio/spaCy NER stack being installed or loaded. The analyzer is built lazily
on first tokenize call (see gateway/tokenizer.get_analyzer), so:

* the gateway starts fast (no multi-second model load at import — DB7 cold start), and
* security-critical modules stay unit-testable without a 560 MB model in CI.
"""

import importlib


def test_tokenizer_module_imports_without_presidio_installed():
    mod = importlib.import_module("gateway.tokenizer")
    assert hasattr(mod, "run_tokenize")
    assert hasattr(mod, "get_analyzer")
