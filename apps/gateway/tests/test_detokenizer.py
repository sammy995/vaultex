"""Tests for gateway/detokenizer.py — verifies RBAC-filtered token replacement."""

import pytest
from gateway.detokenizer import run_detokenize


def test_token_replaced_when_allowed():
    """Token should be replaced when its entity type is in allowed set."""
    token_map = {"{{SSN_1}}": "123-45-6789"}
    allowed = {"SSN"}
    text = "Customer SSN is {{SSN_1}} — please review."

    result = run_detokenize(text, token_map, allowed)
    assert "123-45-6789" in result
    assert "{{SSN_1}}" not in result


def test_token_stays_when_not_allowed():
    """Token must remain when entity type is NOT in allowed set."""
    token_map = {"{{SSN_1}}": "123-45-6789"}
    allowed = set()  # junior_analyst — no de-masking
    text = "Customer SSN is {{SSN_1}} — please review."

    result = run_detokenize(text, token_map, allowed)
    assert "{{SSN_1}}" in result
    assert "123-45-6789" not in result


def test_multiple_tokens_partial_replacement():
    """Only allowed entity types should be replaced; others stay masked."""
    # Short codes: PERSON→PERSON, SSN→SSN, CURRENCY→CURRENCY
    token_map = {
        "{{PERSON_1}}": "John Doe",
        "{{SSN_1}}": "123-45-6789",
        "{{CURRENCY_1}}": "$5,000",
    }
    # senior_analyst: can see PERSON and CURRENCY but not SSN
    allowed = {"PERSON", "CURRENCY"}
    text = "{{PERSON_1}} has SSN {{SSN_1}} and balance {{CURRENCY_1}}."

    result = run_detokenize(text, token_map, allowed)
    assert "John Doe" in result
    assert "$5,000" in result
    assert "{{PERSON_1}}" not in result
    assert "{{CURRENCY_1}}" not in result
    assert "{{SSN_1}}" in result      # not allowed
    assert "123-45-6789" not in result


def test_all_tokens_replaced_for_admin():
    """Admin with all entity types allowed should see everything."""
    # ACCT is the short code for ACCOUNT_NUMBER
    token_map = {
        "{{PERSON_1}}": "Jane Smith",
        "{{ACCT_1}}": "987654321",
        "{{SSN_1}}": "111-22-3333",
    }
    allowed = {"PERSON", "ACCOUNT_NUMBER", "SSN", "CURRENCY", "LOAN_ID"}
    text = "Name: {{PERSON_1}}, Account: {{ACCT_1}}, SSN: {{SSN_1}}"

    result = run_detokenize(text, token_map, allowed)
    assert "Jane Smith" in result
    assert "987654321" in result
    assert "111-22-3333" in result
    assert "{{" not in result


def test_unknown_token_not_in_map_stays():
    """A token whose key is not in the map should be left as-is."""
    token_map = {}
    allowed = {"PERSON"}
    text = "Hello {{PERSON_99}}"

    result = run_detokenize(text, token_map, allowed)
    assert "{{PERSON_99}}" in result


def test_empty_text():
    """Empty string should return empty string."""
    result = run_detokenize("", {}, set())
    assert result == ""


def test_no_tokens_in_text():
    """Text with no token patterns should be returned unchanged."""
    text = "This is a clean message with no tokens."
    result = run_detokenize(text, {"{{PERSON_1}}": "Alice"}, {"PERSON"})
    assert result == text


def test_currency_short_code_mapping():
    """CURRENCY short code tokens should map to CURRENCY entity type."""
    token_map = {"{{CURRENCY_1}}": "$10,000"}
    allowed = {"CURRENCY"}
    text = "Balance: {{CURRENCY_1}}"

    result = run_detokenize(text, token_map, allowed)
    assert "$10,000" in result


def test_routing_short_code_to_routing_number():
    """ROUTING short code maps to ROUTING_NUMBER entity type — allowed."""
    token_map = {"{{ROUTING_1}}": "021000021"}
    allowed = {"ROUTING_NUMBER"}
    text = "Routing: {{ROUTING_1}}"

    result = run_detokenize(text, token_map, allowed)
    assert "021000021" in result


def test_routing_number_not_allowed():
    """ROUTING token stays masked when ROUTING_NUMBER not in allowed."""
    token_map = {"{{ROUTING_1}}": "021000021"}
    allowed = {"PERSON"}
    text = "Routing: {{ROUTING_1}}"

    result = run_detokenize(text, token_map, allowed)
    assert "{{ROUTING_1}}" in result
    assert "021000021" not in result


def test_loan_short_code_to_loan_id():
    """LOAN short code maps to LOAN_ID entity type."""
    token_map = {"{{LOAN_1}}": "LOAN-ABC123"}
    allowed = {"LOAN_ID"}
    text = "Loan ref: {{LOAN_1}}"

    result = run_detokenize(text, token_map, allowed)
    assert "LOAN-ABC123" in result


def test_multiple_occurrences_same_token():
    """A token appearing multiple times is replaced in all positions."""
    token_map = {"{{SSN_1}}": "555-44-3333"}
    allowed = {"SSN"}
    text = "SSN {{SSN_1}} confirmed. Record {{SSN_1}} filed."

    result = run_detokenize(text, token_map, allowed)
    assert result.count("555-44-3333") == 2
    assert "{{SSN_1}}" not in result
