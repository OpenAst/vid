import sys
def fact(num):
  if num < 0:
    raise ValueError("Number cannot be less negative")
  elif num == 0:
    return 1
  else:
    return num * fact(num - 1)
  
num_int = int(sys.argv[1]) 
factorial_of_num = fact(num_int)
print(f"Factorial of number: {num_int} is {factorial_of_num}")