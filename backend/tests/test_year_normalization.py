import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from app.agents.comparison_agent import (
    normalize_fiscal_year,
    normalize_reporting_type,
    parse_reporting_details,
    _validate_year_and_type,
    ComparisonAgent,
)


class TestFiscalYearNormalization:
    """Test suite for normalize_fiscal_year as specified in requirements."""

    def test_required_fiscal_year_cases(self):
        # Mandatory test cases from Section 10
        assert normalize_fiscal_year("FY2025") == 2025
        assert normalize_fiscal_year("FY2025 YOY") == 2025
        assert normalize_fiscal_year("FY 2025") == 2025
        assert normalize_fiscal_year("FY-2025") == 2025
        assert normalize_fiscal_year("Fiscal Year 2025") == 2025
        assert normalize_fiscal_year("2025") == 2025
        assert normalize_fiscal_year("2025 YOY") == 2025

    def test_additional_realistic_labels(self):
        # Realistic financial report formats
        assert normalize_fiscal_year("FY 2025 YOY") == 2025
        assert normalize_fiscal_year("FY2025 YoY") == 2025
        assert normalize_fiscal_year("Fiscal Year 2025 YOY") == 2025
        assert normalize_fiscal_year("FY25") == 2025
        assert normalize_fiscal_year("FY 25") == 2025
        assert normalize_fiscal_year("FY-25") == 2025
        assert normalize_fiscal_year("FY 2024-25") == 2025
        assert normalize_fiscal_year("FY2024-2025") == 2025
        assert normalize_fiscal_year("FY2026 (Year ended March 31, 2026)") == 2026
        assert normalize_fiscal_year(2025) == 2025
        assert normalize_fiscal_year("Q1 2025") == 2025

    def test_invalid_and_empty_inputs(self):
        assert normalize_fiscal_year(None) is None
        assert normalize_fiscal_year("") is None
        assert normalize_fiscal_year("   ") is None
        assert normalize_fiscal_year("N/A") is None
        assert normalize_fiscal_year("none") is None
        assert normalize_fiscal_year("Invalid Text Only") is None


class TestReportingDetailsAndYoYPreservation:
    """Test that YoY information is preserved in comparison_basis without losing it."""

    def test_yoy_preservation(self):
        details = parse_reporting_details("FY2025 YOY")
        assert details["fiscal_year"] == 2025
        assert details["comparison_basis"] == "YOY"
        assert details["reporting_period"] == "FY2025"
        assert details["reporting_type"] == "annual"

    def test_standard_fy_details(self):
        details = parse_reporting_details("FY2025")
        assert details["fiscal_year"] == 2025
        assert details["comparison_basis"] is None
        assert details["reporting_period"] == "FY2025"
        assert details["reporting_type"] == "annual"

    def test_quarterly_details(self):
        details = parse_reporting_details("Q2 2025")
        assert details["fiscal_year"] == 2025
        assert details["comparison_basis"] is None
        assert details["reporting_period"] == "Q2 2025"
        assert details["reporting_type"] == "Q2"


class TestComparisonValidation:
    """Test suite for period and reporting type validation as specified in Section 11."""

    def test_1_identical_annual_periods_allowed(self):
        """TEST 1: FY2025 + FY2025 → comparison allowed"""
        companies = [
            {"company_name": "Company A", "financial_year": "FY2025"},
            {"company_name": "Company B", "financial_year": "FY2025"},
        ]
        assert _validate_year_and_type(companies) is True

    def test_2_equivalent_annual_and_yoy_allowed(self):
        """TEST 2: FY2025 + FY2025 YOY → comparison allowed (NovaGrid vs Vertex case)"""
        companies = [
            {"company_name": "NovaGrid Energy Systems PLC", "financial_year": "FY2025"},
            {"company_name": "Vertex Manufacturing Corporation Limited", "financial_year": "FY2025 YOY"},
        ]
        assert _validate_year_and_type(companies) is True
        # Both companies should be enriched with normalized 2025
        assert companies[0]["fiscal_year"] == 2025
        assert companies[1]["fiscal_year"] == 2025
        assert companies[0]["reporting_type"] == "annual"
        assert companies[1]["reporting_type"] == "annual"
        assert companies[1]["comparison_basis"] == "YOY"

    def test_3_both_yoy_allowed(self):
        """TEST 3: FY2025 YOY + FY2025 YOY → comparison allowed"""
        companies = [
            {"company_name": "Company A", "financial_year": "FY2025 YOY"},
            {"company_name": "Company B", "financial_year": "FY 2025 YOY"},
        ]
        assert _validate_year_and_type(companies) is True

    def test_4_different_years_blocked(self):
        """TEST 4: FY2024 + FY2025 → comparison blocked"""
        companies = [
            {"company_name": "Company A", "financial_year": "FY2024"},
            {"company_name": "Company B", "financial_year": "FY2025"},
        ]
        assert _validate_year_and_type(companies) is False

    def test_5_invalid_or_missing_year_blocked(self):
        """TEST 5: Invalid/missing year → controlled validation failure"""
        companies_missing = [
            {"company_name": "Company A", "financial_year": "FY2025"},
            {"company_name": "Company B", "financial_year": None},
        ]
        assert _validate_year_and_type(companies_missing) is False

        companies_invalid = [
            {"company_name": "Company A", "financial_year": "FY2025"},
            {"company_name": "Company B", "financial_year": "Unspecified Period"},
        ]
        assert _validate_year_and_type(companies_invalid) is False

    def test_6_annual_vs_quarterly_blocked(self):
        """TEST 6: Annual FY2025 + incompatible quarterly period → blocked according to existing reporting-period rules"""
        companies = [
            {"company_name": "Company A", "financial_year": "FY2025 annual"},
            {"company_name": "Company B", "financial_year": "Q2 2025"},
        ]
        assert _validate_year_and_type(companies) is False

    def test_compare_method_controlled_failure(self):
        """Verify that agent.compare returns controlled JSON failure instead of raising unhandled exception."""
        agent = ComparisonAgent()
        mismatched_companies = [
            {"company_name": "Company A", "financial_year": "FY2024"},
            {"company_name": "Company B", "financial_year": "FY2025"},
        ]
        result_json = agent.compare(mismatched_companies)
        assert '"status": "failed"' in result_json
        assert "mismatched financial years or reporting types" in result_json


if __name__ == "__main__":
    t1 = TestFiscalYearNormalization()
    t1.test_required_fiscal_year_cases()
    t1.test_additional_realistic_labels()
    t1.test_invalid_and_empty_inputs()
    print("TestFiscalYearNormalization: ALL PASSED")

    t2 = TestReportingDetailsAndYoYPreservation()
    t2.test_yoy_preservation()
    t2.test_standard_fy_details()
    t2.test_quarterly_details()
    print("TestReportingDetailsAndYoYPreservation: ALL PASSED")

    t3 = TestComparisonValidation()
    t3.test_1_identical_annual_periods_allowed()
    t3.test_2_equivalent_annual_and_yoy_allowed()
    t3.test_3_both_yoy_allowed()
    t3.test_4_different_years_blocked()
    t3.test_5_invalid_or_missing_year_blocked()
    t3.test_6_annual_vs_quarterly_blocked()
    t3.test_compare_method_controlled_failure()
    print("TestComparisonValidation: ALL PASSED")
    print("\nALL 100% UNIT TESTS PASSED SUCCESSFULLY!")

