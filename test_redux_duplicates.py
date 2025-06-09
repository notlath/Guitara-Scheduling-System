#!/usr/bin/env python3
"""
Test script to find Redux action duplicates in the schedulingSlice.js file
"""
import re

def find_duplicate_reducers():
    file_path = "c:\\Users\\USer\\Downloads\\Guitara-Scheduling-System\\royal-care-frontend\\src\\features\\scheduling\\schedulingSlice.js"
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Find all .addCase patterns
        add_case_pattern = r'\.addCase\((\w+\.\w+),'
        matches = re.findall(add_case_pattern, content)
        
        print("Found addCase entries:")
        action_counts = {}
        for match in matches:
            if match in action_counts:
                action_counts[match] += 1
            else:
                action_counts[match] = 1
            print(f"  {match}")
        
        print("\nDuplicate actions:")
        duplicates = {action: count for action, count in action_counts.items() if count > 1}
        
        if duplicates:
            for action, count in duplicates.items():
                print(f"  {action}: {count} times")
        else:
            print("  No duplicates found")
            
        return duplicates
        
    except Exception as e:
        print(f"Error reading file: {e}")
        return {}

if __name__ == "__main__":
    find_duplicate_reducers()
