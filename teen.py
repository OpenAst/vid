class Teen():
  def __init__(self, age, height):
    self.age = age
    self.height = height

  def total(self):
    return self.age + self.height    
  
teen = Teen(12, 23)

print(f"You're in the range of a teen: {teen.total()}")