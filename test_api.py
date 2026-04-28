"""
PST Customer API Test Script
Tests Token Request and basic API endpoints
"""

import requests
import json
import sys

# API Configuration
TEST_API_BASE_URL = "https://testpstapi.dbsinfo.com"
PROD_API_BASE_URL = "https://pstapi.dbsinfo.com"

# Credentials
API_USERNAME = "ApiUserPRB"
API_PASSWORD = "f801-0aA^C3A92eB28eB"

# DBS Code - may need to be provided by the API administrator
# Try common values if not provided as argument
DBS_CODE = sys.argv[1] if len(sys.argv) > 1 else "DBD"

# Use test API by default, can be changed
BASE_URL = TEST_API_BASE_URL


def get_token():
    """Request and return an OAuth token"""
    url = f"{BASE_URL}/token"
    
    data = {
        "grant_type": "password",
        "apiusername": API_USERNAME,
        "apipassword": API_PASSWORD,
        "dbscode": DBS_CODE
    }
    
    headers = {
        "Accept": "*/*",
        "Cache-Control": "no-cache",
        "Content-Type": "application/x-www-form-urlencoded"
    }
    
    print("=" * 60)
    print("TOKEN REQUEST")
    print("=" * 60)
    print(f"URL: {url}")
    print(f"Data: grant_type=password, apiusername={API_USERNAME}, dbscode={DBS_CODE}")
    print("-" * 60)
    
    try:
        response = requests.post(url, data=data, headers=headers, timeout=30)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            token_data = response.json()
            return token_data.get("access_token"), token_data
        else:
            print(f"ERROR: Failed to get token. Status: {response.status_code}")
            return None, None
    except Exception as e:
        print(f"ERROR: {e}")
        return None, None


def test_jobs_search(token, base_url):
    """Test the Jobs Search endpoint"""
    url = f"{base_url}/jobs"
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "*/*",
        "Cache-Control": "no-cache"
    }
    
    print("\n" + "=" * 60)
    print("JOBS SEARCH REQUEST")
    print("=" * 60)
    print(f"URL: {url}")
    print("-" * 60)
    
    try:
        response = requests.get(url, headers=headers, timeout=30)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text[:2000]}...")  # Truncate for readability
        
        if response.status_code == 200:
            return response.json()
        else:
            print(f"ERROR: Failed to search jobs. Status: {response.status_code}")
            return None
    except Exception as e:
        print(f"ERROR: {e}")
        return None


def test_entities_search(token, base_url):
    """Test the Entities Search endpoint"""
    url = f"{base_url}/Entities"
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "*/*",
        "Cache-Control": "no-cache"
    }
    
    print("\n" + "=" * 60)
    print("ENTITIES SEARCH REQUEST")
    print("=" * 60)
    print(f"URL: {url}")
    print("-" * 60)
    
    try:
        response = requests.get(url, headers=headers, timeout=30)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text[:2000]}...")
        
        if response.status_code == 200:
            return response.json()
        else:
            print(f"ERROR: Failed to search entities. Status: {response.status_code}")
            return None
    except Exception as e:
        print(f"ERROR: {e}")
        return None


def test_api_url(url, dbs_code):
    """Test a specific API URL with given DBS code"""
    url = f"{url}/token"
    
    data = {
        "grant_type": "password",
        "apiusername": API_USERNAME,
        "apipassword": API_PASSWORD,
        "dbscode": dbs_code
    }
    
    headers = {
        "Accept": "*/*",
        "Cache-Control": "no-cache",
        "Content-Type": "application/x-www-form-urlencoded"
    }
    
    print("=" * 60)
    print(f"TOKEN REQUEST to {url}")
    print("=" * 60)
    print(f"Data: grant_type=password, apiusername={API_USERNAME}, dbscode={dbs_code}")
    print("-" * 60)
    
    try:
        response = requests.post(url, data=data, headers=headers, timeout=30)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            return response.json().get("access_token"), response.json()
        else:
            return None, None
    except Exception as e:
        print(f"ERROR: {e}")
        return None, None


def main():
    print("PST API Test Script")
    print(f"Username: {API_USERNAME}")
    print(f"DBS Code: {DBS_CODE}")
    print()
    
    BASE_URL = TEST_API_BASE_URL  # Default
    token = None
    token_data = None
    
    # Try test API first
    print("Attempting TEST API...")
    token, token_data = test_api_url(TEST_API_BASE_URL, DBS_CODE)
    
    if not token:
        # Try production API
        print("\nAttempting PRODUCTION API...")
        token, token_data = test_api_url(PROD_API_BASE_URL, DBS_CODE)
        if token:
            BASE_URL = PROD_API_BASE_URL
    
    if not token:
        print("\nFATAL: Could not obtain token with any API/DBS combination.")
        print("Please verify:")
        print("  1. The correct DBS code for your account")
        print("  2. Whether you should use Test or Production API")
        print("\nUsage: python test_api.py <DBS_CODE>")
        return
    
    print("\n" + "=" * 60)
    print("TOKEN OBTAINED SUCCESSFULLY")
    print("=" * 60)
    if token_data:
        print(f"Token Type: {token_data.get('token_type', 'N/A')}")
        print(f"Expires In: {token_data.get('expires_in', 'N/A')} seconds")
        print(f"Access Token: {token[:50]}...")
    
    # Step 2: Test Jobs Search
    jobs_result = test_jobs_search(token, BASE_URL)
    
    # Step 3: Test Entities Search
    entities_result = test_entities_search(token, BASE_URL)
    
    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    print(f"API Base URL: {BASE_URL}")
    print(f"Token Request: {'SUCCESS' if token else 'FAILED'}")
    print(f"Jobs Search: {'SUCCESS' if jobs_result else 'FAILED'}")
    print(f"Entities Search: {'SUCCESS' if entities_result else 'FAILED'}")
    
    if jobs_result:
        jobs = jobs_result.get("Jobs", [])
        print(f"Jobs Found: {len(jobs)}")
    
    if entities_result:
        entities = entities_result.get("Entities", [])
        print(f"Entities Found: {len(entities)}")


if __name__ == "__main__":
    main()
