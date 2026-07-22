# Module 00: Java Foundations

## What You'll Learn

- What programming is and why we use Java
- How to install the Java Development Kit (JDK) and an IDE
- Your first Java program — Hello World
- Variables and primitive types
- Reference types (String, arrays)
- Operators (arithmetic, relational, logical, ternary)
- Control flow: if/else, switch, loops
- Methods: parameters, return types, void
- Object-Oriented Programming: classes, objects, constructors
- The four OOP pillars: encapsulation, inheritance, polymorphism, abstraction
- Interfaces and abstract classes
- Java collections: List, Set, Map
- Java 21 records
- Enums
- Exception handling
- Generics basics
- The `var` keyword
- Packages and imports

## Prerequisites

- A computer running macOS, Linux, or Windows
- No prior programming experience required — we start from zero

---

## 1. What Is Programming?

**Programming** is the act of writing instructions for a computer to execute. A computer is very fast at following instructions, but it needs you to write them in a language it understands.

You cook a meal by following a recipe step by step. Programming is the same — you write a recipe (called a **program**) and the computer (the chef) executes it.

### What Is Java?

**Java** is a programming language created in 1995 by Sun Microsystems (now owned by Oracle). It is one of the most popular programming languages in the world, used by millions of developers to build:

- Backend services (the server side of web applications)
- Android mobile apps
- Enterprise software (banking, e-commerce, healthcare)
- Big data processing systems

### Why Java?

| Feature | Benefit |
|---------|---------|
| **Write once, run anywhere** | Java compiles to bytecode that runs on any operating system with a JVM |
| **Strongly typed** | The compiler catches errors before the code runs |
| **Object-oriented** | Organizes code into reusable components (classes) |
| **Huge ecosystem** | Thousands of libraries and frameworks (like Spring Boot) |
| **Large community** | Easy to find help, tutorials, and answers |

### The JVM, JDK, and JRE

These three terms are confusing for beginners, so let's clarify:

| Term | Full Name | What It Is | Do You Need It? |
|------|-----------|------------|-------------------|
| **JVM** | Java Virtual Machine | Runs Java bytecode on your computer | Yes — it runs your programs |
| **JRE** | Java Runtime Environment | JVM + core libraries (enough to run Java programs) | Only if you just want to run, not compile |
| **JDK** | Java Development Kit | JRE + compiler (`javac`) + development tools | Yes — this is what you install as a developer |

Think of it this way:
- The **JVM** is the engine in a car
- The **JRE** is the engine + the basic parts needed to drive
- The **JDK** is the engine + tools to build and modify the car

---

## 2. Installing the JDK and an IDE

### Installing the JDK

We will use **JDK 21** (the latest Long-Term Support version as of 2025).

**macOS (using Homebrew):**
```bash
brew install openjdk@21
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt install openjdk-21-jdk
```

**Windows:**
Download the installer from [Adoptium (Eclipse Temurin)](https://adoptium.net/) and run it.

### Verifying the Installation

Open a terminal (Command Prompt on Windows, Terminal on macOS/Linux) and type:

```bash
java -version
```

You should see something like:
```
openjdk version "21.0.x" 2024-xx-xx
```

### Installing an IDE

An **IDE (Integrated Development Environment)** is a program that helps you write code — like a word processor but for programming. It highlights syntax, suggests completions, and helps find errors.

We recommend **IntelliJ IDEA Community Edition** (free):

1. Go to [https://www.jetbrains.com/idea/download/](https://www.jetbrains.com/idea/download/)
2. Download the Community Edition (free, not the Ultimate edition)
3. Install it following the instructions for your operating system

---

## 3. Your First Java Program — Hello World

Every programmer's first program prints "Hello, World!" to the screen. Let's do it.

### Creating the File

In IntelliJ IDEA:
1. Click **New Project**
2. Name it `ordermgmt`
3. Select **Java** as the language
4. Select **21** as the JDK
5. Click **Create**

IntelliJ creates a project with this structure:
```
ordermgmt/
├── src/
│   └── Main.java
└── ordermgmt.iml
```

### The Hello World Program

```java
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}
```

### Line-by-Line Explanation

**`public class Main`** — declares a class named `Main`. In Java, every file contains one public class, and the file name must match the class name (so this must be in `Main.java`). A **class** is a container for code — we'll explain classes in detail later.

**`public static void main(String[] args)`** — this is the **main method**, the entry point of every Java program. When you run a Java application, the JVM looks for this method and executes it.

- `public` — this method can be accessed from outside the class
- `static` — this method belongs to the class itself, not to an instance of the class (we'll explain this when we cover OOP)
- `void` — this method does not return a value
- `main` — the method name (the JVM looks for exactly this name)
- `String[] args` — an array of text arguments passed to the program from the command line

**`System.out.println("Hello, World!");`** — prints the text `Hello, World!` to the console (the screen) and moves to the next line.

- `System` is a built-in Java class that provides system-level functionality
- `out` is a field on `System` that represents the standard output (the console)
- `println` is a method that prints text and adds a newline at the end
- `"Hello, World!"` is a **string literal** — text enclosed in double quotes
- The semicolon `;` marks the end of the statement (like a period at the end of a sentence)

### Running the Program

In IntelliJ: click the green play button next to `main`. Or right-click and select **Run 'Main.main()'**.

In the terminal:
```bash
javac Main.java    # Compiles the .java file into a .class file
java Main          # Runs the compiled program
```

Output:
```
Hello, World!
```

---

## 4. Variables and Primitive Types

A **variable** is a named container that stores a value. You give it a name, a type, and assign a value.

### Primitive Types

Java has 8 **primitive types** — basic building blocks that store simple values:

| Type | Description | Size | Example Values |
|------|-------------|------|----------------|
| `int` | Whole numbers (no decimals) | 32 bits | 0, 42, -7, 1000000 |
| `long` | Very large whole numbers | 64 bits | 9000000000000L |
| `double` | Decimal numbers | 64 bits | 3.14, -0.001, 99.99 |
| `float` | Smaller decimal numbers | 32 bits | 3.14f |
| `boolean` | True or false | 1 bit | true, false |
| `char` | A single character | 16 bits | 'A', '3', '$' |
| `byte` | Small whole number | 8 bits | -128 to 127 |
| `short` | Medium whole number | 16 bits | -32768 to 32767 |

### Declaring Variables

```java
public class Variables {
    public static void main(String[] args) {
        // Declare and assign in one step
        int age = 30;
        double price = 19.99;
        boolean isActive = true;
        char grade = 'A';

        // Declare first, assign later
        long population;
        population = 8000000000L; // L suffix means "long"

        // Print the values
        System.out.println("Age: " + age);
        System.out.println("Price: " + price);
        System.out.println("Active: " + isActive);
        System.out.println("Grade: " + grade);
        System.out.println("Population: " + population);
    }
}
```

### Important Notes About Money

Never use `double` or `float` for money. Floating-point numbers can have rounding errors:

```java
// PROBLEM: floating point rounding errors
double a = 0.1 + 0.2;
System.out.println(a); // Prints 0.30000000000000004, NOT 0.3!

// SOLUTION: use BigDecimal for money (we'll cover this later)
```

For money, always use `java.math.BigDecimal`. We'll introduce it when we build the Order Management domain.

---

## 5. Reference Types: String and Arrays

### Strings

A **String** is a sequence of characters (text). It is a **reference type**, not a primitive — meaning it's an object with methods:

```java
String name = "Alice";
String greeting = "Hello, " + name + "!"; // Concatenation with +

System.out.println(greeting); // Hello, Alice!
System.out.println(name.length()); // 5 (the length method)
System.out.println(name.toUpperCase()); // ALICE
System.out.println(name.charAt(0)); // A (character at position 0)
```

### Arrays

An **array** is a fixed-size collection of values of the same type:

```java
// Declare and initialize an array
int[] numbers = {10, 20, 30, 40, 50};

// Access elements by index (starts at 0)
System.out.println(numbers[0]); // 10
System.out.println(numbers[2]); // 30

// Change an element
numbers[0] = 100;
System.out.println(numbers[0]); // 100

// Length of array
System.out.println(numbers.length); // 5
```

---

## 6. Operators

### Arithmetic Operators

```java
int a = 10;
int b = 3;

System.out.println(a + b);  // 13 (addition)
System.out.println(a - b);  // 7  (subtraction)
System.out.println(a * b);  // 30 (multiplication)
System.out.println(a / b);  // 3  (integer division — no remainder)
System.out.println(a % b);  // 1  (modulus — remainder of division)

// Increment and decrement
int count = 0;
count++;  // count is now 1 (same as count = count + 1)
count--;  // count is now 0 (same as count = count - 1)
```

### Relational Operators

These compare two values and return a `boolean` (`true` or `false`):

```java
int x = 5;
int y = 10;

System.out.println(x == y);  // false (equal to)
System.out.println(x != y);  // true  (not equal to)
System.out.println(x < y);   // true  (less than)
System.out.println(x > y);   // false (greater than)
System.out.println(x <= 5);  // true  (less than or equal)
System.out.println(x >= 6);  // false (greater than or equal)
```

### Logical Operators

These combine boolean values:

```java
boolean isLoggedIn = true;
boolean hasPermission = false;

System.out.println(isLoggedIn && hasPermission); // false (AND — both must be true)
System.out.println(isLoggedIn || hasPermission); // true  (OR — at least one must be true)
System.out.println(!isLoggedIn);                 // false (NOT — inverts the value)
```

### Ternary Operator

A shorthand for if/else:

```java
int score = 75;
String result = (score >= 60) ? "Pass" : "Fail";
System.out.println(result); // Pass
```

---

## 7. Control Flow

Control flow statements let your program make decisions and repeat actions.

### if / else if / else

```java
int temperature = 25;

if (temperature > 30) {
    System.out.println("It's hot outside!");
} else if (temperature > 20) {
    System.out.println("It's warm and pleasant.");
} else if (temperature > 10) {
    System.out.println("It's cool.");
} else {
    System.out.println("It's cold!");
}
```

### switch

When you have many possible values for a single variable, `switch` is cleaner than a long if/else chain:

```java
String day = "MONDAY";

switch (day) {
    case "MONDAY" -> System.out.println("Start of the work week");
    case "FRIDAY" -> System.out.println("Almost the weekend!");
    case "SATURDAY", "SUNDAY" -> System.out.println("Weekend!");
    default -> System.out.println("Midweek");
}
```

### for Loop

```java
// Traditional for loop
for (int i = 0; i < 5; i++) {
    System.out.println("Iteration " + i);
}

// Enhanced for loop (for-each) — used with arrays and collections
int[] numbers = {10, 20, 30};
for (int num : numbers) {
    System.out.println(num);
}
```

### while Loop

```java
int count = 0;
while (count < 3) {
    System.out.println("Count: " + count);
    count++;
}
```

### do-while Loop

Like `while`, but the condition is checked at the end — so the body always runs at least once:

```java
int i = 0;
do {
    System.out.println("At least once: " + i);
    i++;
} while (i < 3);
```

---

## 8. Methods

A **method** is a reusable block of code that does one task. Think of it as a recipe inside your program.

```java
public class Methods {

    // A method that takes parameters and returns a value
    static int add(int a, int b) {
        return a + b;
    }

    // A method that returns nothing (void)
    static void greet(String name) {
        System.out.println("Hello, " + name + "!");
    }

    // A method with no parameters
    static double getPi() {
        return 3.14159;
    }

    public static void main(String[] args) {
        int sum = add(5, 3);           // Calls add, stores the result
        System.out.println(sum);       // 8

        greet("Alice");                 // Calls greet (prints "Hello, Alice!")

        double pi = getPi();
        System.out.println(pi);         // 3.14159
    }
}
```

### Method Parts

- **Return type** — what type of value the method produces (`int`, `String`, `void`). `void` means no return value.
- **Name** — how you call the method (`add`, `greet`, `getPi`)
- **Parameters** — inputs the method receives (`int a, int b`)
- **Body** — the code that runs when the method is called
- **Return statement** — sends the result back to the caller (`return a + b;`)

---

## 9. Object-Oriented Programming (OOP)

So far, everything has been inside `main` methods with `static`. Real Java programs use **classes and objects** — this is called **Object-Oriented Programming (OOP)**.

### What Is a Class?

A **class** is a blueprint. It describes what data an object holds and what it can do.

A **class is to an object what a blueprint is to a house.** You can build many houses from one blueprint.

```java
public class Customer {
    // Fields — the data the object holds
    String name;
    String email;
    int age;

    // Constructor — creates a new Customer object
    Customer(String name, String email, int age) {
        this.name = name;
        this.email = email;
        this.age = age;
    }

    // Method — what the object can do
    void printInfo() {
        System.out.println("Name: " + name);
        System.out.println("Email: " + email);
        System.out.println("Age: " + age);
    }
}

public class Main {
    public static void main(String[] args) {
        // Create a Customer object (instance of the Customer class)
        Customer customer = new Customer("Alice", "alice@example.com", 30);

        // Call its method
        customer.printInfo();
        // Name: Alice
        // Email: alice@example.com
        // Age: 30
    }
}
```

### What Is `this`?

In a constructor or method, `this` refers to the current object — the one being created or operated on. In `this.name = name;`, the left side (`this.name`) is the field, and the right side (`name`) is the parameter. They have the same name, so `this.` distinguishes the field from the parameter.

---

## 10. The Four Pillars of OOP

### 1. Encapsulation

**Encapsulation** means hiding internal data and only allowing access through controlled methods (getters and setters).

```java
public class Product {
    private String name;     // private — cannot be accessed directly from outside
    private double price;

    public Product(String name, double price) {
        setName(name);
        setPrice(price);
    }

    // Getter — provides read access
    public String getName() {
        return name;
    }

    // Setter — provides write access with validation
    public void setName(String name) {
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("Name cannot be blank");
        }
        this.name = name;
    }

    public double getPrice() {
        return price;
    }

    public void setPrice(double price) {
        if (price < 0) {
            throw new IllegalArgumentException("Price cannot be negative");
        }
        this.price = price;
    }
}
```

Without encapsulation, anyone could set `product.price = -1000`. With encapsulation, the setter validates the input.

### 2. Inheritance

**Inheritance** means a class can inherit fields and methods from another class.

```java
// Parent class (also called "superclass" or "base class")
public class Animal {
    String name;

    public Animal(String name) {
        this.name = name;
    }

    public void eat() {
        System.out.println(name + " is eating.");
    }
}

// Child class (also called "subclass" or "derived class")
public class Dog extends Animal {
    public Dog(String name) {
        super(name); // Calls the parent's constructor
    }

    public void bark() {
        System.out.println(name + " says: Woof!");
    }
}

// Usage:
Dog dog = new Dog("Rex");
dog.eat();  // Inherited from Animal — prints "Rex is eating."
dog.bark(); // Defined in Dog — prints "Rex says: Woof!"
```

### 3. Polymorphism

**Polymorphism** means the same method call can behave differently depending on the object type.

```java
public class Animal {
    String name;
    public Animal(String name) { this.name = name; }
    public void makeSound() {
        System.out.println(name + " makes a generic sound.");
    }
}

public class Dog extends Animal {
    public Dog(String name) { super(name); }
    @Override
    public void makeSound() {
        System.out.println(name + " says: Woof!");
    }
}

public class Cat extends Animal {
    public Cat(String name) { super(name); }
    @Override
    public void makeSound() {
        System.out.println(name + " says: Meow!");
    }
}

// Polymorphism in action:
Animal[] animals = { new Dog("Rex"), new Cat("Whiskers") };
for (Animal animal : animals) {
    animal.makeSound(); // Each calls its own version!
}
// Rex says: Woof!
// Whiskers says: Meow!
```

The variable type is `Animal`, but the actual method called depends on the real object type (`Dog` or `Cat`). This is polymorphism.

### 4. Abstraction

**Abstraction** means hiding complex implementation details and exposing only what's necessary.

There are two ways to achieve abstraction in Java: **abstract classes** and **interfaces**.

---

## 11. Interfaces and Abstract Classes

### Interface

An **interface** is a contract. It defines what methods a class must have, but not how they work.

```java
// Interface — defines a contract
public interface Discountable {
    double applyDiscount(double discountPercent);
}

// A class can implement an interface
public class Order implements Discountable {
    private double total;

    public Order(double total) {
        this.total = total;
    }

    @Override
    public double applyDiscount(double discountPercent) {
        return total * (1 - discountPercent / 100);
    }
}

// Another class can implement the same interface differently
public class Product implements Discountable {
    private double price;

    public Product(double price) {
        this.price = price;
    }

    @Override
    public double applyDiscount(double discountPercent) {
        double newPrice = price * (1 - discountPercent / 100);
        return Math.max(newPrice, 0); // Price cannot go below 0
    }
}
```

### Abstract Class

An **abstract class** is like a partially built class — it can have both implemented methods and abstract methods (methods without a body that subclasses must implement).

```java
public abstract class Shape {
    // Abstract method — subclasses MUST implement this
    public abstract double calculateArea();

    // Concrete method — inherited as-is
    public String describe() {
        return "Shape with area: " + calculateArea();
    }
}

public class Circle extends Shape {
    private double radius;

    public Circle(double radius) {
        this.radius = radius;
    }

    @Override
    public double calculateArea() {
        return Math.PI * radius * radius;
    }
}

// Usage:
Shape circle = new Circle(5);
System.out.println(circle.describe()); // Shape with area: 78.539...
```

### Interface vs Abstract Class

| Feature | Interface | Abstract Class |
|---------|-----------|----------------|
| Can have method bodies | Only `default` methods | Yes |
| Can have fields | Only constants (`static final`) | Yes |
| A class can have | Multiple interfaces | Only one parent class |
| Use when | You want to define a contract | You want to share implementation |

---

## 12. Java Collections

Collections are data structures that store groups of objects. The three most common are:

### List

A `List` is an ordered collection that allows duplicates:

```java
import java.util.ArrayList;
import java.util.List;

List<String> names = new ArrayList<>();
names.add("Alice");
names.add("Bob");
names.add("Charlie");
names.add("Alice"); // Duplicates allowed

System.out.println(names.size()); // 4
System.out.println(names.get(0)); // Alice
System.out.println(names.get(1)); // Bob

// Iterate over the list
for (String name : names) {
    System.out.println(name);
}

// Remove an element
names.remove("Bob");
System.out.println(names.size()); // 3
```

### Set

A `Set` is a collection that does NOT allow duplicates:

```java
import java.util.HashSet;
import java.util.Set;

Set<String> uniqueNames = new HashSet<>();
uniqueNames.add("Alice");
uniqueNames.add("Bob");
uniqueNames.add("Alice"); // Duplicate — ignored!

System.out.println(uniqueNames.size()); // 2
```

### Map

A `Map` stores key-value pairs (like a dictionary):

```java
import java.util.HashMap;
import java.util.Map;

Map<String, Integer> ages = new HashMap<>();
ages.put("Alice", 30);
ages.put("Bob", 25);
ages.put("Charlie", 35);

System.out.println(ages.get("Alice")); // 30
System.out.println(ages.containsKey("Bob")); // true
System.out.println(ages.size()); // 3

// Iterate over entries
for (Map.Entry<String, Integer> entry : ages.entrySet()) {
    System.out.println(entry.getKey() + " is " + entry.getValue() + " years old");
}
```

---

## 13. Java 21 Records

A **record** is a special kind of class designed for holding data. It's a shortcut for creating immutable objects.

### Before Records (the old way)

```java
public class CustomerDTO {
    private final Long id;
    private final String name;
    private final String email;

    public CustomerDTO(Long id, String name, String email) {
        this.id = id;
        this.name = name;
        this.email = email;
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public String getEmail() { return email; }

    // Plus equals(), hashCode(), toString() — lots of boilerplate!
}
```

### With Records (the Java 21 way)

```java
public record CustomerDTO(Long id, String name, String email) {}
```

That single line does everything the 20-line class above does:
- Constructor
- Getters (`id()`, `name()`, `email()`)
- `equals()`, `hashCode()`, `toString()`
- Immutability (fields are `final`)

```java
CustomerDTO customer = new CustomerDTO(1L, "Alice", "alice@example.com");
System.out.println(customer.name());     // Alice (getter uses the field name, not getName())
System.out.println(customer.email());    // alice@example.com
System.out.println(customer);            // CustomerDTO[id=1, name=Alice, email=alice@example.com]
```

### Our Domain Entities as Records

Now we can define our Order Management domain entities using records (these are plain data objects — in later modules, we'll use JPA entities for the database):

```java
public record Customer(
        Long id,
        String name,
        String email,
        String address,
        Instant createdAt
) {}

public record Product(
        Long id,
        String name,
        BigDecimal price,
        int stock,
        String category,
        Instant createdAt
) {}

public record OrderItem(
        Long id,
        Product product,
        int quantity,
        BigDecimal unitPrice
) {}

public record Order(
        Long id,
        Customer customer,
        List<OrderItem> items,
        OrderStatus status,
        BigDecimal totalAmount,
        Instant createdAt
) {}
```

---

## 14. Enums

An **enum** is a type that has a fixed set of values. Think of it as a list of named constants.

```java
public enum OrderStatus {
    PENDING,
    CONFIRMED,
    SHIPPED,
    DELIVERED,
    CANCELLED
}

// Usage:
OrderStatus status = OrderStatus.PENDING;
System.out.println(status); // PENDING

// Enums in switch statements
switch (status) {
    case PENDING -> System.out.println("Waiting for confirmation");
    case CONFIRMED -> System.out.println("Order is confirmed");
    case SHIPPED -> System.out.println("Order is on the way");
    case DELIVERED -> System.out.println("Order delivered");
    case CANCELLED -> System.out.println("Order was cancelled");
}

// Get all possible values
OrderStatus[] allStatuses = OrderStatus.values();
for (OrderStatus s : allStatuses) {
    System.out.println(s);
}
```

### Why Use Enums Instead of Strings?

If you use `String status = "PENDING"`, you could accidentally type `status = "PENDNG"` (typo) and the compiler wouldn't catch it. With enums, `OrderStatus.PENDNG` is a compile error.

---

## 15. Exception Handling

An **exception** is an error that occurs while the program is running. If not handled, the program crashes. Java provides `try`, `catch`, and `finally` to handle exceptions gracefully.

### try / catch

```java
try {
    int[] numbers = {1, 2, 3};
    System.out.println(numbers[10]); // Index out of bounds!
} catch (ArrayIndexOutOfBoundsException e) {
    System.out.println("Error: " + e.getMessage());
}
System.out.println("Program continues..."); // This runs because we caught the exception
```

### Multiple catch blocks

```java
try {
    String text = null;
    System.out.println(text.length()); // NullPointerException
} catch (NullPointerException e) {
    System.out.println("Null reference: " + e.getMessage());
} catch (Exception e) {
    System.out.println("Other error: " + e.getMessage());
}
```

### finally

The `finally` block always runs, whether an exception occurred or not:

```java
try {
    System.out.println("Trying something...");
    int result = 10 / 0; // ArithmeticException
} catch (ArithmeticException e) {
    System.out.println("Error: " + e.getMessage());
} finally {
    System.out.println("This always runs"); // Cleanup code goes here
}
```

### Throwing Exceptions

You can also throw exceptions yourself:

```java
public void setAge(int age) {
    if (age < 0) {
        throw new IllegalArgumentException("Age cannot be negative: " + age);
    }
    this.age = age;
}
```

### Checked vs Unchecked Exceptions

| Type | Must Handle? | Examples | When to Use |
|------|-------------|----------|-------------|
| **Checked** | Yes — compiler enforces try/catch | `IOException`, `SQLException` | Recoverable errors |
| **Unchecked** | No — compiler doesn't enforce | `RuntimeException`, `NullPointerException`, `IllegalArgumentException` | Programming errors (bugs) |

Most of the time, you'll throw unchecked exceptions (extending `RuntimeException`) for programming errors like invalid input or missing data.

### Custom Exceptions

```java
public class OrderNotFoundException extends RuntimeException {
    private final Long orderId;

    public OrderNotFoundException(Long orderId) {
        super("Order not found: " + orderId);
        this.orderId = orderId;
    }

    public Long getOrderId() {
        return orderId;
    }
}

// Usage:
throw new OrderNotFoundException(42L);
```

---

## 16. Generics

**Generics** allow you to write code that works with different types while maintaining type safety.

```java
// Without generics — type unsafe
List list = new ArrayList();
list.add("Hello");
String s = (String) list.get(0); // Must cast — error-prone

// With generics — type safe
List<String> list = new ArrayList<>();
list.add("Hello");
String s = list.get(0); // No cast needed — compiler knows it's a String
```

### Generic Methods

```java
// This method works with any type T
public static <T> T getFirst(List<T> list) {
    if (list.isEmpty()) {
        return null;
    }
    return list.get(0);
}

// Usage:
String firstString = getFirst(List.of("Alice", "Bob"));
Integer firstNumber = getFirst(List.of(1, 2, 3));
```

---

## 17. The `var` Keyword

Java 10+ introduced `var`, which lets the compiler infer the type:

```java
// Without var — explicit type
String name = "Alice";
List<String> names = new ArrayList<>();
Map<String, Integer> ages = new HashMap<>();

// With var — compiler infers the type
var name = "Alice";                     // var -> String
var names = new ArrayList<String>();   // var -> ArrayList<String>
var ages = new HashMap<String, Integer>(); // var -> HashMap<String, Integer>
```

**When to use `var`:** Use it when the type is obvious from the right side of the assignment. Don't use it when it makes the type unclear:

```java
// GOOD — type is obvious
var customers = new ArrayList<Customer>();
var order = new Order(1L, customer, items, OrderStatus.PENDING, total, Instant.now());

// BAD — type is unclear
var result = process(data); // What type is result? Unclear.
```

---

## 18. Packages and Imports

### Packages

A **package** is a folder that groups related classes. It prevents name conflicts — two classes can have the same name if they're in different packages.

```
com.example.ordermgmt
├── domain/          # Domain entities (Customer, Product, Order)
├── controller/      # REST controllers
├── service/         # Business logic
├── repository/      # Data access
└── dto/             # Data Transfer Objects
```

To declare a class as part of a package:

```java
package com.example.ordermgmt.domain;

public class Customer {
    // ...
}
```

### Imports

To use a class from another package, you **import** it:

```java
package com.example.ordermgmt.service;

// Import from the domain package
import com.example.ordermgmt.domain.Customer;
import com.example.ordermgmt.domain.Order;

// Import from the repository package
import com.example.ordermgmt.repository.CustomerRepository;

// Import from Java's standard library
import java.util.List;
import java.util.Optional;

public class OrderService {
    private CustomerRepository customerRepository;

    public List<Order> getCustomerOrders(Long customerId) {
        Customer customer = customerRepository.findById(customerId);
        // ...
    }
}
```

---

## Exercises

### Exercise 1: Create a Customer Record

Create a `Customer` record with fields: `id` (Long), `name` (String), `email` (String). Create two customers and print them to the console.

<details>
<summary>Hint</summary>

```java
public record Customer(Long id, String name, String email) {}

Customer c1 = new Customer(1L, "Alice", "alice@example.com");
Customer c2 = new Customer(2L, "Bob", "bob@example.com");
System.out.println(c1);
System.out.println(c2);
```
</details>

### Exercise 2: Write a Method That Calculates Order Total

Write a method `calculateTotal(BigDecimal unitPrice, int quantity)` that returns `unitPrice * quantity`. Handle the case where quantity is negative by throwing an `IllegalArgumentException`.

<details>
<summary>Hint</summary>

Use `BigDecimal.multiply(BigDecimal.valueOf(quantity))` for the calculation. Check `if (quantity < 0)` before calculating. Import `java.math.BigDecimal`.
</details>

### Exercise 3: Use a List of Orders

Create a `List<Order>` where `Order` is a record. Add 3 orders to the list, iterate over them, and print each order's status using a `switch` statement.

<details>
<summary>Hint</summary>

Define `OrderStatus` as an enum with `PENDING`, `CONFIRMED`, `DELIVERED`. Create the `Order` record with fields `id`, `status`, `totalAmount`. Use `List.of(...)` to create the list and an enhanced for loop to iterate.
</details>

### Exercise 4: Create a Custom Exception

Create an `InsufficientStockException` that takes a product name, available stock, and requested quantity. Throw it when a product doesn't have enough stock. Catch it and print the error message.

<details>
<summary>Hint</summary>

Extend `RuntimeException`. The constructor takes `(String productName, int available, int requested)` and calls `super(String.format("Insufficient stock for %s: available=%d, requested=%d", ...))`. Use try/catch in `main`.
</details>

### Exercise 5: Build a Simple Discount Calculator

Create an interface `Discountable` with a method `applyDiscount(double percent)`. Implement it in an `Order` class that stores a `BigDecimal total`. Apply a 10% discount and verify the result.

<details>
<summary>Hint</summary>

The interface declares `BigDecimal applyDiscount(double percent)`. The Order class implements it: `return total.multiply(BigDecimal.valueOf(1 - percent / 100))`. Create an order with `new BigDecimal("100.00")` and apply 10% discount — expect `90.00`.
</details>

---

## What You Learned

- **Java** is a strongly-typed, object-oriented programming language that runs on the JVM
- The **JDK** includes everything you need to compile and run Java programs
- A Java program starts at the `main` method: `public static void main(String[] args)`
- **Primitive types** (`int`, `double`, `boolean`, `char`, etc.) store simple values
- Use `BigDecimal` for money — never `double` or `float`
- **Control flow** (`if/else`, `switch`, `for`, `while`) lets programs make decisions and repeat actions
- **Methods** are reusable blocks of code that take parameters and return values
- **OOP** organizes code into classes and objects with four pillars: encapsulation, inheritance, polymorphism, abstraction
- **Interfaces** define contracts; **abstract classes** share partial implementation
- **Collections** (`List`, `Set`, `Map`) store groups of objects
- **Records** are immutable data classes: `public record Customer(Long id, String name) {}` replaces 20+ lines of boilerplate
- **Enums** define a fixed set of values — better than strings for type safety
- **Exceptions** handle runtime errors with `try`/`catch`/`finally`
- **Generics** provide type safety for collections: `List<String>`
- **`var`** lets the compiler infer the type when it's obvious from context
- **Packages** group related classes; **imports** bring classes from other packages into scope

---

## 13. Java String API in Depth

Strings are the most used type in Java. Understanding them deeply prevents subtle bugs.

### Immutability

Java strings are **immutable** — once created, they cannot be changed. Every
"modification" creates a new String object:

```java
String name = "Alice";
name = name + " Smith";  // creates a NEW String, old one is garbage collected
```

This means `==` compares references, not content. Always use `.equals()`:

```java
String a = "hello";
String b = new String("hello");

System.out.println(a == b);        // false — different objects
System.out.println(a.equals(b));   // true  — same content

// Java 21+ — pattern matching for String in switch
if (a instanceof String s && s.equals("hello")) {
    System.out.println("It's hello: " + s);
}
```

### StringBuilder for Efficient Concatenation

In loops, use `StringBuilder` instead of `+` to avoid creating intermediate objects:

```java
// BAD: creates a new String on every iteration
String result = "";
for (int i = 0; i < 1000; i++) {
    result += i + ",";  // 1000 String objects created!
}

// GOOD: mutates a single buffer
StringBuilder sb = new StringBuilder();
for (int i = 0; i < 1000; i++) {
    sb.append(i).append(",");
}
String result = sb.toString();
```

### Text Blocks (Java 15+)

Multi-line strings without escape sequences:

```java
// Before text blocks — messy
String json = "{\n" +
        "  \"name\": \"Alice\",\n" +
        "  \"age\": 30\n" +
        "}";

// With text blocks — clean
String json = """
        {
          "name": "Alice",
          "age": 30
        }
        """;

// The closing """ controls indentation
```

### String.format() and Formatted

```java
String name = "Alice";
int age = 30;
BigDecimal price = new BigDecimal("19.99");

// printf-style formatting
String message = String.format("Name: %s, Age: %d, Price: $%.2f", name, age, price);

// Java 21+ — .formatted() instance method
String message2 = "Name: %s, Age: %d, Price: $%.2f".formatted(name, age, price);
```

---

## 14. Java Exception Handling Deep Dive

### Checked vs Unchecked

| Type | Example | Must Catch? | When to Use |
|------|---------|-------------|-------------|
| Checked | `IOException`, `SQLException` | Yes — compiler enforces | Recoverable conditions (file not found, network) |
| Unchecked | `RuntimeException`, `NullPointerException` | No | Programming errors (bad logic, null access) |

```java
// Checked exception — must declare or catch
public String readFile(String path) throws IOException {
    return Files.readString(Path.of(path));
}

// Unchecked exception — no declaration needed
public int divide(int a, int b) {
    if (b == 0) {
        throw new IllegalArgumentException("Divisor cannot be zero");
    }
    return a / b;
}
```

### Try-With-Resources (Java 7+)

Automatically closes resources that implement `AutoCloseable`:

```java
// Before Java 7 — verbose with finally
BufferedReader reader = null;
try {
    reader = new BufferedReader(new FileReader("data.txt"));
    String line = reader.readLine();
} catch (IOException e) {
    log.error("Read failed", e);
} finally {
    if (reader != null) {
        try { reader.close(); } catch (IOException e) { /* ignored */ }
    }
}

// With try-with-resources — clean and safe
try (var reader = new BufferedReader(new FileReader("data.txt"))) {
    String line = reader.readLine();
} catch (IOException e) {
    log.error("Read failed", e);
}
// reader is automatically closed, even if exception occurs
```

### Custom Exceptions

```java
public class InsufficientStockException extends RuntimeException {
    private final String productName;
    private final int requested;
    private final int available;

    public InsufficientStockException(String productName, int requested, int available) {
        super(String.format("Insufficient stock for %s: requested %d, available %d",
                productName, requested, available));
        this.productName = productName;
        this.requested = requested;
        this.available = available;
    }

    public String getProductName() { return productName; }
    public int getRequested() { return requested; }
    public int getAvailable() { return available; }
}
```

### Exception Chaining

When catching and re-throwing, always preserve the original cause:

```java
try {
    orderService.process(order);
} catch (SQLException e) {
    // Wrap in a domain-specific exception, preserving the root cause
    throw new OrderProcessingException("Failed to process order " + order.getId(), e);
}
```

---

## 15. Java Collections Framework

### Core Collection Types

```
Collection
├── List (ordered, allows duplicates)
│   ├── ArrayList    — fast random access, slow insert/delete at front
│   └── LinkedList    — fast insert/delete, slow random access
├── Set (no duplicates)
│   ├── HashSet       — O(1) lookup, no order
│   ├── LinkedHashSet — maintains insertion order
│   └── TreeSet       — sorted by natural ordering or Comparator
└── Queue / Deque
    ├── ArrayDeque    — fast double-ended queue
    └── PriorityQueue — ordered by priority

Map (key-value pairs, not a Collection)
├── HashMap          — O(1) lookup, no order
├── LinkedHashMap    — maintains insertion order
└── TreeMap          — sorted by key
```

### Choosing the Right Collection

```java
// Need indexed access and iteration? → ArrayList
List<Order> orders = new ArrayList<>();
orders.add(order1);
orders.get(0);  // O(1)

// Need uniqueness? → HashSet
Set<String> processedEmails = new HashSet<>();
processedEmails.add("alice@example.com");
processedEmails.add("alice@example.com");  // ignored — already present

// Need key-value lookup? → HashMap
Map<Long, Customer> customerById = new HashMap<>();
customerById.put(1L, alice);
customerById.get(1L);  // O(1)

// Need sorted iteration? → TreeSet
Set<BigDecimal> prices = new TreeSet<>();
prices.add(new BigDecimal("19.99"));
prices.add(new BigDecimal("9.99"));
// Iterates: 9.99, 19.99 (sorted)
```

### HashMap Internals

`HashMap` uses an array of "buckets". The key's `hashCode()` determines which bucket
it goes into. If two keys have the same hash (collision), they're stored as a
linked list (or balanced tree after Java 8).

```java
// Proper hashCode/equals contract is CRITICAL for HashMap keys
public record CustomerKey(Long id, String email) {
    // Records auto-generate correct equals() and hashCode()
    // If using a class, you MUST override both
}
```

**Rule:** If you override `equals()`, you MUST override `hashCode()`. Two objects that
are `equals()` must have the same `hashCode()`. Records handle this automatically.

### Collections Utility Methods

```java
List<String> names = new ArrayList<>(List.of("Charlie", "Alice", "Bob"));

// Sort
Collections.sort(names);                         // [Alice, Bob, Charlie]
names.sort(Comparator.reverseOrder());            // [Charlie, Bob, Alice]

// Unmodifiable view
List<String> readOnly = Collections.unmodifiableList(names);

// Frequency
int count = Collections.frequency(names, "Alice");

// Binary search (requires sorted list)
int index = Collections.binarySearch(names, "Bob");
```

---

## 15. Java Stream API in Depth

The Stream API (Java 8+) is the modern way to process collections. Unlike
a `for` loop, streams are **declarative** — you describe *what* you want,
not *how* to iterate.

### Creating Streams

```java
// From a collection
Stream<Order> fromList = orders.stream();

// From values
Stream<String> values = Stream.of("a", "b", "c");

// From an array
String[] array = {"a", "b", "c"};
Stream<String> fromArray = Arrays.stream(array);

// Infinite stream
Stream<Double> randoms = Stream.generate(Math::random);
Stream<Integer> naturals = Stream.iterate(1, n -> n + 1);

// Bounded infinite stream (Java 9+)
Stream<Integer> upTo100 = Stream.iterate(1, n -> n <= 100, n -> n + 1);
```

### Intermediate Operations (Lazy)

Intermediate operations return a new Stream and are **lazy** — they don't
execute until a terminal operation is called.

```java
orders.stream()
    .filter(o -> o.getStatus() == OrderStatus.PENDING)   // lazy
    .map(Order::getTotalAmount)                            // lazy
    .sorted()                                              // lazy
    // nothing has executed yet!
    .forEach(amount -> log.info("${}", amount));          // terminal — now it runs
```

### Terminal Operations (Eager)

| Terminal | Returns | Purpose |
|----------|---------|---------|
| `collect(Collectors.toList())` | `List<T>` | Collect into a list |
| `collect(Collectors.groupingBy(...))` | `Map<K, List<T>>` | Group by a key |
| `collect(Collectors.joining(", "))` | `String` | Join elements into a string |
| `reduce(...)` | `Optional<T>` | Reduce to a single value |
| `count()` | `long` | Count elements |
| `findFirst()` | `Optional<T>` | Get the first element |
| `anyMatch(Predicate)` | `boolean` | Check if any element matches |
| `forEach(Consumer)` | `void` | Side effect per element |

### Practical Examples

```java
// Group orders by status
Map<OrderStatus, List<Order>> byStatus = orders.stream()
        .collect(Collectors.groupingBy(Order::getStatus));

// Total revenue of confirmed orders
BigDecimal revenue = orders.stream()
        .filter(o -> o.getStatus() == OrderStatus.CONFIRMED)
        .map(Order::getTotalAmount)
        .reduce(BigDecimal.ZERO, BigDecimal::add);

// Top 3 most expensive orders
List<Order> top3 = orders.stream()
        .sorted(Comparator.comparing(Order::getTotalAmount).reversed())
        .limit(3)
        .toList();

// Partition into pending and non-pending
Map<Boolean, List<Order>> partitioned = orders.stream()
        .collect(Collectors.partitioningBy(o -> o.getStatus() == OrderStatus.PENDING));
```

### Parallel Streams

```java
// Process in parallel across multiple threads
long count = orders.parallelStream()
        .filter(o -> o.getStatus() == OrderStatus.PENDING)
        .count();
```

**Warning:** Only use parallel streams for **CPU-bound** operations on **large**
datasets (>10,000 items). For small datasets, the overhead of thread
coordination makes it slower than sequential streams.

---

## 16. Optional — Handling Absence Safely

`Optional<T>` is a container that may or may not contain a value. It forces
you to handle the "absent" case explicitly, reducing NPEs.

### Creating Optional

```java
Optional<Order> empty = Optional.empty();
Optional<Order> present = Optional.of(order);           // NPE if order is null
Optional<Order> nullable = Optional.ofNullable(order);  // OK if order is null
```

### Using Optional

```java
// Check if present
if (orderOptional.isPresent()) {
    Order order = orderOptional.get();  // safe now
}

// Better: functional style
orderOptional.ifPresent(order -> process(order));

// Provide a default
Order order = orderOptional.orElse(defaultOrder);
Order order = orderOptional.orElseGet(() -> createDefault());  // lazy

// Throw if absent
Order order = orderOptional.orElseThrow(() -> new OrderNotFoundException(id));

// Transform
String name = orderOptional
        .map(Order::getCustomer)
        .map(Customer::getName)
        .orElse("Unknown");
```

### Optional Anti-Patterns

```java
// BAD: don't use Optional for fields
public class OrderService {
    private Optional<OrderRepository> repo;  // NO — use nullable or inject directly
}

// BAD: don't use Optional for parameters
public void process(Optional<Order> order) { }  // NO — use method overloading or @Nullable

// GOOD: Optional as a return type from methods that might not have a result
public Optional<Order> findById(Long id) {
    return Optional.ofNullable(repo.find(id));
}
```

---

## 17. Java I/O and NIO Basics

### Reading a File

```java
import java.nio.file.Files;
import java.nio.file.Path;

// Read all lines at once (small files)
List<String> lines = Files.readAllLines(Path.of("orders.csv"));

// Read as a stream (large files — lines are loaded lazily)
try (Stream<String> stream = Files.lines(Path.of("large-orders.csv"))) {
    stream.filter(line -> line.contains("CONFIRMED"))
          .forEach(System.out::println);
}  // stream is automatically closed

// Read entire file as a string
String content = Files.readString(Path.of("config.json"));
```

### Writing a File

```java
// Write a list of lines
Files.write(Path.of("output.txt"), List.of("line 1", "line 2"));

// Append to a file
Files.writeString(Path.of("log.txt"), "New log entry\n",
        StandardOpenOption.CREATE, StandardOpenOption.APPEND);
```

### Try-With-Resources for I/O

Always wrap I/O operations in try-with-resources to ensure resources are closed:

```java
try (var reader = Files.newBufferedReader(Path.of("data.csv"));
     var writer = Files.newBufferedWriter(Path.of("output.csv"))) {
    String line;
    while ((line = reader.readLine()) != null) {
        writer.write(transform(line));
        writer.newLine();
    }
}  // reader and writer auto-closed
```

---


## Recommended YouTube Videos

- **[Java Tutorial for Beginners]** by Telusko — Complete Java tutorial from basics, covers all fundamental topics in this module
  https://www.youtube.com/watch?v=BGTx91t8q50

- **[Java 21 Programming Masterclass]** (playlist) — Full Java 21 course covering modern Java features including records and pattern matching
  https://www.youtube.com/playlist?list=PLpPMD23DomFWYbayBG6-a8yQqNMeBf1C7

---

← **First Module** | [Next: Module 01](./01-build-tools-and-project-setup.md) →
