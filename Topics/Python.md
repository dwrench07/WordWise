Here is the complete Python Syntax Q&A summary formatted in clean, readable Markdown.

### Q1: How do you create an empty dictionary and add a key-value pair 'apple': 5 to it?

**A:** Correct way:

```python
my_dict = {}
my_dict['apple'] = 5

```

*Note: Avoid using `dict` as a variable name since it shadows Python's built-in. Use `my_dict` instead.*
*Tags: python, dictionary, syntax*

---

### Q2: Given `nums = [10, 20, 30, 40, 50]`, how do you get the last two elements using slicing?

**A:** For slicing to get both as a list:

```python
nums[-2:] # gives [40, 50]

```

*Tags: python, lists, slicing*

---

### Q3: How do you unpack point (3, 7) into two variables?

**A:** ```python
x, y = point

```
*Tags: python, unpacking, variables*

---

### Q4: Sort a list of tuples (`students`) by the second element in descending order.
**A:** ```python
students.sort(key=lambda x: x[1], reverse=True)

```

*Tags: python, sorting, lambda, review*

---

### Q5: How do you create a min heap and push values 5, 2, 8?

**A:** ```python
import heapq

heap = []
heapq.heappush(heap, 5)
heapq.heappush(heap, 2)
heapq.heappush(heap, 8)

```
* To pop: `heapq.heappop(heap)`
* To peek: `heap[0]`
* For max heap, negate values: `heapq.heappush(heap, -5)`

*Tags: python, heap, data-structures, review*

---

### Q6: Count character frequency using Counter for s = 'aabbbc'
**A:** ```python
from collections import Counter

c = Counter(s) # Counter({'b': 3, 'a': 2, 'c': 1})

```

*Tags: python, collections, counter, review*

---

### Q7: Simulate a do-while loop that asks for input until user types 'quit'.

**A:** ```python
while True:
user_input = input()
if user_input == 'quit':
break
# do something with user_input

```
*Tags: python, loops, review*

---

### Q8: What's the difference between `b = a` and `b = a[:]`?
**A:** * `b = a` creates a **reference** to the exact same list.
* `b = a[:]` creates a **shallow copy** (not a deep copy).

For nested lists, use `copy.deepcopy(a)` for a true deep copy.
*Tags: python, references, copying*

---

### Q9: Use `defaultdict` to group words by their first letter.
**A:** ```python
from collections import defaultdict

words = ['apple', 'banana', 'apricot', 'cherry', 'blueberry']
output = defaultdict(list) # takes a TYPE, not data

for word in words:
    output[word[0]].append(word)

```

*Tags: python, collections, defaultdict*

---

### Q10: Iterate through two lists (`names`, `scores`) at the same time.

**A:** ```python
for name, score in zip(names, scores):
print(f'{name}: {score}')

```
*Tags: python, iteration, zip*

---

### Q11: What does this code print?
```python
nums = [1, 2, 3, 4, 5]
print(nums[1:4])
print(nums[::2])
print(nums[::-1])

```

**A:** * `nums[1:4]` -> `[2, 3, 4]` (end index is exclusive)

* `nums[::2]` -> `[1, 3, 5]` (every 2nd element)
* `nums[::-1]` -> `[5, 4, 3, 2, 1]` (reversed)

*Tags: python, lists, slicing, review*

---

### Q12: How do you check if a key exists in a dictionary `d`?

**A:** ```python
if string in d:
pass

```
*Tags: python, dictionary*

---

### Q13: What is wrong with modifying a list while iterating over it? How can you safely do it? (e.g., removing even numbers)
**A:** The main issue is modifying a list while iterating over it causes elements to be skipped. Solutions:

1. Create a new list:
```python
nums = [x for x in nums if x % 2 != 0]

```

2. Iterate over a copy:

```python
for num in nums[:]:
    if num % 2 == 0:
        nums.remove(num)

```

3. Iterate backwards:

```python
for i in range(len(nums) - 1, -1, -1):
    if nums[i] % 2 == 0:
        nums.pop(i)

```

*Tags: python, iteration, lists*

---

### Q14: How do you create a set and check if an element exists?

**A:** Use lowercase `set()` (Note: `{}` creates an empty dict, not a set).

```python
x = set()
x.add(1)
if 1 in x:
    print('exists')

```

*Tags: python, sets, review*

---

### Q15: Get both index and value when looping through a list `fruits`.

**A:** ```python
for i, fruit in enumerate(fruits):
print(f'{i}: {fruit}')

```
*Tags: python, iteration, enumerate*

---

### Q16: What's the output?
```python
s = 'hello'
print(s[1:4])
print(s[-3:])
print(s.find('l'))
print(s.count('l'))

```

**A:** * `s[1:4]` -> `'ell'`

* `s[-3:]` -> `'llo'`
* `s.find('l')` -> `2`
* `s.count('l')` -> `2`

*Tags: python, strings, methods*

---

### Q17: Convert between string `s`, list of characters `chars`, integer string `num_str`, and integer `num`.

**A:** ```python
list(s)          # string to list
''.join(chars)   # list to string (separator calls join!)
int(num_str)     # string to int
str(num)         # int to string

```
*Tags: python, types, conversion, review*

---

### Q18: What does this output?
```python
nums = [1, 2, 3, 4, 5]
result = [x * 2 for x in nums if x % 2 == 1]

```

**A:** `[2, 6, 10]`
*Tags: python, list-comprehension*

---

### Q19: Use `deque` to implement a queue.

**A:** `collections` is lowercase:

```python
from collections import deque

d = deque()
d.append(1)
d.popleft()

```

*Tags: python, collections, deque*

---

### Q20: What's the difference between `/` and `//`?

```python
print(7 / 2)
print(7 // 2)
print(-7 // 2)

```

**A:** * `7 / 2` -> `3.5` (regular division)

* `7 // 2` -> `3` (floor division)
* `-7 // 2` -> `-4` (floors toward negative infinity, not toward zero!)

*Tags: python, math, division, review*

---

### Q21: How to use `lru_cache` for memoization? (e.g., Fibonacci)

**A:** ```python
from functools import lru_cache

@lru_cache(maxsize=None)
def fib(n):
if n <= 1:
return n
return fib(n-1) + fib(n-2)

```
*Tags: python, memoization, decorators*

---

### Q22: How do you swap two variables `x` and `y`?
**A:** ```python
x, y = y, x

```

*Tags: python, variables*

---

### Q23: What's the output?

```python
s = 'hello world'
print(s.split())
print(s.split('o'))
print('_'.join(s.split()))

```

**A:** `split()` splits by whitespace by default, not characters.

* `s.split()` -> `['hello', 'world']`
* `s.split('o')` -> `['hell', ' w', 'rld']`
* `'_'.join(s.split())` -> `'hello_world'`

*Tags: python, strings, methods*

---

### Q24: Get the maximum value and its index from a list `nums`.

**A:** ```python
max(nums)             # max value
nums.index(max(nums)) # index of max

```
*Tags: python, lists, math*

---

### Q25: What does `*` do in different contexts? (e.g., `print(*nums)`, `def func(*args)`, `a, *b, c = [1,2,3,4,5]`)
**A:** 1. `print(*nums)` -> Unpacks list elements: prints `1 2 3`
2. `def func(*args):` -> Collects arbitrary positional arguments into a tuple `args`
3. `a, *b, c = [1, 2, 3, 4, 5]` -> Unpacks list variables: `a=1`, `b=[2,3,4]`, `c=5`

*Tags: python, unpacking, args*

---

### Q26: Check if a string `x` is a palindrome.
**A:** Strings don't have a `.reverse()` method. Use slicing:
```python
if x == x[::-1]:
    print('palindrome')

```

*Tags: python, strings, slicing, review*

---

### Q27: What's wrong with `d = {}; d['a'] += 1`?

**A:** The key `'a'` isn't initialized yet, so we cannot do `+= 1` on it (raises a KeyError).

Solutions: use `defaultdict(int)`, `Counter`, or check if the key exists first.
*Tags: python, dictionary, errors*

---

### Q28: Remove duplicates from `nums` while preserving order.

**A:** ```python
result = list(dict.fromkeys(nums))

```
*Tags: python, lists, duplicates*

---

### Q29: What's the output?
```python
x = [1, 2, 3]
y = x * 2
z = [x] * 2
y[0] = 99
z[0][0] = 99
print(y)
print(z)

```

**A:** * `y = x * 2` -> `[1, 2, 3, 1, 2, 3]` (new flat list)

* `z = [x] * 2` -> `[[1,2,3], [1,2,3]]` (two references to the SAME list)

After modifications:

* `y` -> `[99, 2, 3, 1, 2, 3]`
* `z` -> `[[99, 2, 3], [99, 2, 3]]` (both nested elements changed because they point to the same object!)

*Tags: python, lists, references, review*

---

### Q30: Create a 3x3 grid filled with zeros.

**A:** ```python
grid = [[0] * 3 for _ in range(3)]

```
*Note: Doing `[[0] * 3] * 3` is wrong because it creates references to the same inner list.*
*Tags: python, lists, grid, review*

---

### Q31: Perform a binary search for the value `7` in a sorted list `nums = [1, 3, 5, 7, 9, 11]`.
**A:** ```python
from bisect import bisect_left

nums = [1, 3, 5, 7, 9, 11]
idx = bisect_left(nums, 7) # returns 3

```

*Tags: python, binary-search, bisect*

---

Would you like me to adjust the formatting (e.g., removing the tags or adding bolding to specific keywords) to better match how you review your notes?.