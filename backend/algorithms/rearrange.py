from collections import Counter
import heapq

def rearrange_string(s: str) -> str:
    # Step 1: Count frequencies of each character
    freq = Counter(s)

    # Step 2: Build a max-heap (use negative frequencies for max-heap in Python)
    heap = [(-count, char) for char, count in freq.items()]
    heapq.heapify(heap)

    result = []
    prev_count, prev_char = 0, ''


    while heap:
        count, char = heapq.heappop(heap)
        result.append(char)

        # Push the previous character back into the heap if its frequency is > 0
        if prev_count < 0:
            heapq.heappush(heap, (prev_count, prev_char))

        # Update previous character and its frequency
        prev_count, prev_char = count + 1, char

    # Step 4: Check if the result is valid
    if len(result) == len(s):
        return ''.join(result)
    else:
        return ""

if __name__ == "__main__":
    string = "aaccdee"
    result = rearrange_string(string)
    print(f"Rearranged string: {result}")