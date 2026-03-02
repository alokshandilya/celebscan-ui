import sys

import ijson  # Requires installation: pip install ijson


def count_json_records_streaming(file_path, array_path="item"):
    """
    Count records in a large JSON file using streaming parser.

    Args:
        file_path (str): Path to the JSON file
        array_path (str): Path to the array in the JSON structure

    Returns:
        int: Number of records found
    """
    try:
        count = 0
        with open(file_path, "rb") as file:
            # Parse the JSON stream and count items in the specified array
            parser = ijson.items(file, array_path)
            for _ in parser:
                count += 1

        print(f"Number of records in '{array_path}': {count}")
        return count

    except ImportError:
        print("Error: ijson library not installed. Install with: pip install ijson")
        return None
    except Exception as e:
        print(f"Error: {e}")
        return None


if __name__ == "__main__":
    if len(sys.argv) > 1:
        file_path = sys.argv[1]
        array_path = sys.argv[2] if len(sys.argv) > 2 else "item"
        count_json_records_streaming(file_path, array_path)
    else:
        print("Usage: python script.py <json_file> [array_path]")
        print("Example: python script.py data.json item")
