import time

def findtheSmallest(arr):
  smallest_value = arr[0]
  smallest_index = 0

  for i in range(1, len(arr)):
    if arr[i] < smallest_value:
      smallest_value = arr[i]
      smallest_index = i
  return smallest_index    

# Selection sort
def selectionSort(arr):
  newArr = []
  for i in range(len(arr)):
    smallest = findtheSmallest(arr)
    newArr.append(arr.pop(smallest))
  return newArr
  
arr = [12, 9, 21, 4, 5, 2]

start_time = time.time()

sorted_arr = selectionSort(arr)
end_time = time.time()
execution_time = end_time - start_time

print(sorted_arr)
print(f"Execution time: {execution_time:.6f} seconds")