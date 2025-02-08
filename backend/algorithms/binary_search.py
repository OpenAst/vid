import sys, time

def binary_search(arr, target):
  left, right = 0, len(arr) - 1

  while left <= right:
    mid = (left + right) // 2

    if arr[mid] == target:
      return mid
    elif arr[mid] < target:
      left = mid + 1
    else:
      right = mid - 1
  return -1


if __name__ == '__main__':
  arr = list(map(int, sys.argv[1].split(',')))
  target = int(sys.argv[2])
  start_time = time.time()
  print(binary_search(arr, target))
  end_time = time.time()
  exec_time = end_time - start_time
  print(f"Execution time: {exec_time:.6f} seconds")
