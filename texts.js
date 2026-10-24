/**
 * TypeSpeed text sources. Plain browser script, loaded before script.js,
 * which reads COMMON_WORDS, QUOTES, and CODE_SNIPPETS.
 */

// --- Common Words ---
// Frequent English words. Runs in the Common Words category are drawn from
// this list at random.
const COMMON_WORDS = [
    'the', 'be', 'of', 'and', 'a', 'to', 'in', 'he', 'have', 'it',
    'that', 'for', 'they', 'with', 'as', 'not', 'on', 'she', 'at', 'by',
    'this', 'we', 'you', 'do', 'but', 'from', 'or', 'which', 'one', 'would',
    'all', 'will', 'there', 'say', 'who', 'make', 'when', 'can', 'more', 'if',
    'no', 'man', 'out', 'other', 'so', 'what', 'time', 'up', 'go', 'about',
    'than', 'into', 'could', 'state', 'only', 'new', 'year', 'some', 'take', 'come',
    'these', 'know', 'see', 'use', 'get', 'like', 'then', 'first', 'any', 'work',
    'now', 'may', 'such', 'give', 'over', 'think', 'most', 'even', 'find', 'day',
    'also', 'after', 'way', 'many', 'must', 'look', 'before', 'great', 'back', 'through',
    'long', 'where', 'much', 'should', 'well', 'people', 'down', 'own', 'just', 'because',
    'good', 'each', 'those', 'feel', 'seem', 'how', 'high', 'too', 'place', 'little',
    'world', 'very', 'still', 'nation', 'hand', 'old', 'life', 'tell', 'write', 'become',
    'here', 'show', 'house', 'both', 'between', 'need', 'mean', 'call', 'develop', 'under',
    'last', 'right', 'move', 'thing', 'general', 'school', 'never', 'same', 'another', 'begin',
    'while', 'number', 'part', 'turn', 'real', 'leave', 'might', 'want', 'point', 'form',
    'off', 'child', 'few', 'small', 'since', 'against', 'ask', 'late', 'home', 'interest',
    'large', 'person', 'end', 'open', 'public', 'follow', 'during', 'present', 'without', 'again',
    'hold', 'govern', 'around', 'possible', 'head', 'consider', 'word', 'program', 'problem', 'however',
    'lead', 'system', 'set', 'order', 'eye', 'plan', 'run', 'keep', 'face', 'fact',
    'group', 'play', 'stand', 'increase', 'early', 'course', 'change', 'help', 'line', 'city',
]; // prettier-ignore

// --- Quotes ---
// Category name to passages. `source` is shown after a run and is left
// empty when the attribution could not be confirmed. Book passages are from
// works in the public domain.
const QUOTES = {
    general: [
        { text: 'The quick brown fox jumps over the lazy dog.', source: '' },
        {
            text: 'Productivity is never an accident. It is always the result of a commitment to excellence, intelligent planning, and focused effort.',
            source: '',
        },
        {
            text: 'To be or not to be, that is the question.',
            source: 'William Shakespeare, Hamlet',
        },
        {
            text: 'This above all: to thine own self be true.',
            source: 'William Shakespeare, Hamlet',
        },
        {
            text: 'All our dreams can come true, if we have the courage to pursue them.',
            source: '',
        },
        { text: 'It does not matter how slowly you go as long as you do not stop.', source: '' },
        {
            text: 'Success is not final, failure is not fatal: it is the courage to continue that counts.',
            source: '',
        },
        { text: "Believe you can and you're halfway there.", source: '' },
        {
            text: 'The only way to do great work is to love what you do.',
            source: 'Steve Jobs, Stanford commencement address, 2005',
        },
        { text: 'In the middle of every difficulty lies opportunity.', source: '' },
        {
            text: 'Happiness is not something ready made. It comes from your own actions.',
            source: '',
        },
        {
            text: 'It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of foolishness.',
            source: 'Charles Dickens, A Tale of Two Cities',
        },
        {
            text: 'It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.',
            source: 'Jane Austen, Pride and Prejudice',
        },
        {
            text: 'Happy families are all alike; every unhappy family is unhappy in its own way.',
            source: 'Leo Tolstoy, Anna Karenina',
        },
        {
            text: 'Call me Ishmael. Some years ago, never mind how long precisely, having little or no money in my purse, and nothing particular to interest me on shore, I thought I would sail about a little and see the watery part of the world.',
            source: 'Herman Melville, Moby-Dick',
        },
        {
            text: "In my younger and more vulnerable years my father gave me some advice that I've been turning over in my mind ever since.",
            source: 'F. Scott Fitzgerald, The Great Gatsby',
        },
        {
            text: 'Whether I shall turn out to be the hero of my own life, or whether that station will be held by anybody else, these pages must show.',
            source: 'Charles Dickens, David Copperfield',
        },
        {
            text: 'There was no possibility of taking a walk that day.',
            source: 'Charlotte Bronte, Jane Eyre',
        },
        {
            text: 'Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do.',
            source: "Lewis Carroll, Alice's Adventures in Wonderland",
        },
        {
            text: 'Marley was dead: to begin with. There is no doubt whatever about that.',
            source: 'Charles Dickens, A Christmas Carol',
        },
        {
            text: "You don't know about me without you have read a book by the name of The Adventures of Tom Sawyer; but that ain't no matter.",
            source: 'Mark Twain, Adventures of Huckleberry Finn',
        },
        {
            text: 'Stately, plump Buck Mulligan came from the stairhead, bearing a bowl of lather on which a mirror and a razor lay crossed.',
            source: 'James Joyce, Ulysses',
        },
        {
            text: 'Mrs. Dalloway said she would buy the flowers herself.',
            source: 'Virginia Woolf, Mrs Dalloway',
        },
        {
            text: 'Emma Woodhouse, handsome, clever, and rich, with a comfortable home and happy disposition, seemed to unite some of the best blessings of existence.',
            source: 'Jane Austen, Emma',
        },
        {
            text: 'Robert Cohn was once middleweight boxing champion of Princeton.',
            source: 'Ernest Hemingway, The Sun Also Rises',
        },
        {
            text: 'In the late summer of that year we lived in a house in a village that looked across the river and the plain to the mountains.',
            source: 'Ernest Hemingway, A Farewell to Arms',
        },
        {
            text: 'To Sherlock Holmes she is always the woman.',
            source: 'Arthur Conan Doyle, A Scandal in Bohemia',
        },
        {
            text: 'Mr. Sherlock Holmes, who was usually very late in the mornings, save upon those not infrequent occasions when he was up all night, was seated at the breakfast table.',
            source: 'Arthur Conan Doyle, The Hound of the Baskervilles',
        },
        {
            text: 'The studio was filled with the rich odour of roses, and when the light summer wind stirred amidst the trees of the garden, there came through the open door the heavy scent of the lilac.',
            source: 'Oscar Wilde, The Picture of Dorian Gray',
        },
        {
            text: 'I have just returned from a visit to my landlord, the solitary neighbour that I shall be troubled with.',
            source: 'Emily Bronte, Wuthering Heights',
        },
        {
            text: 'You will rejoice to hear that no disaster has accompanied the commencement of an enterprise which you have regarded with such evil forebodings.',
            source: 'Mary Shelley, Frankenstein',
        },
        {
            text: 'Ours is essentially a tragic age, so we refuse to take it tragically.',
            source: "D. H. Lawrence, Lady Chatterley's Lover",
        },
        {
            text: 'Now, what I want is, Facts. Teach these boys and girls nothing but Facts. Facts alone are wanted in life.',
            source: 'Charles Dickens, Hard Times',
        },
        {
            text: 'I had the story, bit by bit, from various people, and, as generally happens in such cases, each time it was a different story.',
            source: 'Edith Wharton, Ethan Frome',
        },
        {
            text: 'The cold passed reluctantly from the earth, and the retiring fogs revealed an army stretched out on the hills, resting.',
            source: 'Stephen Crane, The Red Badge of Courage',
        },
        {
            text: "No one would have believed in the last years of the nineteenth century that this world was being watched keenly and closely by intelligences greater than man's.",
            source: 'H. G. Wells, The War of the Worlds',
        },
        {
            text: 'The Time Traveller (for so it will be convenient to speak of him) was expounding a recondite matter to us.',
            source: 'H. G. Wells, The Time Machine',
        },
        {
            text: 'Buck did not read the newspapers, or he would have known that trouble was brewing, not alone for himself, but for every tide-water dog.',
            source: 'Jack London, The Call of the Wild',
        },
        { text: 'All children, except one, grow up.', source: 'J. M. Barrie, Peter and Wendy' },
        {
            text: "Dorothy lived in the midst of the great Kansas prairies, with Uncle Henry, who was a farmer, and Aunt Em, who was the farmer's wife.",
            source: 'L. Frank Baum, The Wonderful Wizard of Oz',
        },
        {
            text: '"Christmas won\'t be Christmas without any presents," grumbled Jo, lying on the rug.',
            source: 'Louisa May Alcott, Little Women',
        },
        {
            text: 'It was a dark and stormy night; the rain fell in torrents, except at occasional intervals, when it was checked by a violent gust of wind.',
            source: 'Edward Bulwer-Lytton, Paul Clifford',
        },
        {
            text: 'I went to the woods because I wished to live deliberately, to front only the essential facts of life, and see if I could not learn what it had to teach.',
            source: 'Henry David Thoreau, Walden',
        },
        {
            text: 'Four score and seven years ago our fathers brought forth on this continent, a new nation, conceived in Liberty, and dedicated to the proposition that all men are created equal.',
            source: 'Abraham Lincoln, Gettysburg Address',
        },
        {
            text: "All the world's a stage, and all the men and women merely players.",
            source: 'William Shakespeare, As You Like It',
        },
        {
            text: 'Some are born great, some achieve greatness, and some have greatness thrust upon them.',
            source: 'William Shakespeare, Twelfth Night',
        },
        {
            text: 'The fault, dear Brutus, is not in our stars, but in ourselves, that we are underlings.',
            source: 'William Shakespeare, Julius Caesar',
        },
        {
            text: 'We are such stuff as dreams are made on, and our little life is rounded with a sleep.',
            source: 'William Shakespeare, The Tempest',
        },
        {
            text: 'A foolish consistency is the hobgoblin of little minds.',
            source: 'Ralph Waldo Emerson, Self-Reliance',
        },
        {
            text: 'Squire Trelawney, Dr. Livesey, and the rest of these gentlemen having asked me to write down the whole particulars about Treasure Island, from the beginning to the end.',
            source: 'Robert Louis Stevenson, Treasure Island',
        },
    ],
    technology: [
        {
            text: 'Any sufficiently advanced technology is indistinguishable from magic.',
            source: 'Arthur C. Clarke',
        },
        { text: 'The science of today is the technology of tomorrow.', source: '' },
        { text: 'Technology is best when it brings people together.', source: '' },
        {
            text: 'It has become appallingly obvious that our technology has exceeded our humanity.',
            source: '',
        },
        { text: 'The Web does not just connect machines, it connects people.', source: '' },
        { text: 'Innovation distinguishes between a leader and a follower.', source: '' },
        { text: 'First we build the tools, then they build us.', source: '' },
        { text: "Code is like humor. When you have to explain it, it's bad.", source: '' },
        { text: 'Simplicity is the soul of efficiency.', source: '' },
        { text: 'Make it work, make it right, make it fast.', source: '' },
        {
            text: 'Premature optimization is the root of all evil.',
            source: 'Donald Knuth, Structured Programming with go to Statements',
        },
        {
            text: 'Programs must be written for people to read, and only incidentally for machines to execute.',
            source: 'Abelson and Sussman, Structure and Interpretation of Computer Programs',
        },
        { text: 'Talk is cheap. Show me the code.', source: 'Linus Torvalds' },
        { text: 'Simplicity is prerequisite for reliability.', source: 'Edsger W. Dijkstra' },
        {
            text: 'Controlling complexity is the essence of computer programming.',
            source: 'Brian Kernighan',
        },
        {
            text: 'Debugging is twice as hard as writing the code in the first place. Therefore, if you write the code as cleverly as possible, you are, by definition, not smart enough to debug it.',
            source: 'Brian Kernighan',
        },
        {
            text: 'Walking on water and developing software from a specification are easy if both are frozen.',
            source: 'Edward V. Berard',
        },
        { text: 'The best way to predict the future is to invent it.', source: 'Alan Kay' },
        {
            text: 'Adding manpower to a late software project makes it later.',
            source: 'Fred Brooks, The Mythical Man-Month',
        },
        {
            text: 'Any fool can write code that a computer can understand. Good programmers write code that humans can understand.',
            source: 'Martin Fowler, Refactoring',
        },
        {
            text: 'Testing shows the presence, not the absence of bugs.',
            source: 'Edsger W. Dijkstra',
        },
        {
            text: 'Beware of bugs in the above code; I have only proved it correct, not tried it.',
            source: 'Donald Knuth',
        },
        {
            text: 'Perfection is achieved, not when there is nothing more to add, but when there is nothing left to take away.',
            source: 'Antoine de Saint-Exupery, Wind, Sand and Stars',
        },
        {
            text: "Rule 1: Don't do it. Rule 2, for experts only: Don't do it yet.",
            source: 'Michael A. Jackson',
        },
        {
            text: "A language that doesn't affect the way you think about programming is not worth knowing.",
            source: 'Alan Perlis, Epigrams on Programming',
        },
        {
            text: 'Simplicity does not precede complexity, but follows it.',
            source: 'Alan Perlis, Epigrams on Programming',
        },
        {
            text: 'Fools ignore complexity. Pragmatists suffer it. Some can avoid it. Geniuses remove it.',
            source: 'Alan Perlis, Epigrams on Programming',
        },
        {
            text: 'There are two ways of constructing a software design: one way is to make it so simple that there are obviously no deficiencies, and the other way is to make it so complicated that there are no obvious deficiencies.',
            source: "C. A. R. Hoare, The Emperor's Old Clothes",
        },
        { text: 'When in doubt, use brute force.', source: 'Ken Thompson' },
        {
            text: 'Software is like entropy: it is difficult to grasp, weighs nothing, and obeys the second law of thermodynamics; i.e., it always increases.',
            source: "Norman Augustine, Augustine's Laws",
        },
        { text: 'Real artists ship.', source: 'Steve Jobs' },
        {
            text: 'Science is what we understand well enough to explain to a computer. Art is everything else we do.',
            source: 'Donald Knuth',
        },
        {
            text: 'The purpose of computing is insight, not numbers.',
            source: 'Richard Hamming, Numerical Methods for Scientists and Engineers',
        },
        {
            text: 'Given enough eyeballs, all bugs are shallow.',
            source: 'Eric S. Raymond, The Cathedral and the Bazaar',
        },
        {
            text: 'Plan to throw one away; you will, anyhow.',
            source: 'Fred Brooks, The Mythical Man-Month',
        },
        {
            text: 'The bearing of a child takes nine months, no matter how many women are assigned.',
            source: 'Fred Brooks, The Mythical Man-Month',
        },
        {
            text: 'Bad programmers worry about the code. Good programmers worry about data structures and their relationships.',
            source: 'Linus Torvalds',
        },
        {
            text: 'Optimism is an occupational hazard of programming; feedback is the treatment.',
            source: 'Kent Beck, Extreme Programming Explained',
        },
        {
            text: 'The question of whether a computer can think is no more interesting than the question of whether a submarine can swim.',
            source: 'Edsger W. Dijkstra',
        },
        {
            text: 'Computers are good at following instructions, but not at reading your mind.',
            source: 'Donald Knuth, The TeXbook',
        },
        {
            text: 'Lisp is worth learning for the profound enlightenment experience you will have when you finally get it.',
            source: 'Eric S. Raymond, How To Become A Hacker',
        },
        { text: 'Weeks of coding can save you hours of planning.', source: '' },
        { text: "It's not a bug, it's a feature.", source: '' },
        {
            text: 'There are only two hard things in computer science: cache invalidation and naming things.',
            source: 'Phil Karlton',
        },
        {
            text: 'Good code is its own best documentation.',
            source: 'Steve McConnell, Code Complete',
        },
        {
            text: 'One of my most productive days was throwing away 1000 lines of code.',
            source: 'Ken Thompson',
        },
        {
            text: "Show me your tables, and I won't usually need your flowcharts; they'll be obvious.",
            source: 'Fred Brooks, The Mythical Man-Month',
        },
        {
            text: 'A program that produces incorrect results twice as fast is infinitely slower.',
            source: '',
        },
        {
            text: 'Measuring programming progress by lines of code is like measuring aircraft building progress by weight.',
            source: '',
        },
        { text: 'Deleted code is debugged code.', source: '' },
    ],
};

// --- Code Snippets ---
// Language name to multi-line snippets for the Code Snippets category.
// Indentation is spaces; lines are joined with \n.
const CODE_SNIPPETS = {
    javascript: [
        [
            'function debounce(fn, wait) {',
            '    let timer;',
            '    return (...args) => {',
            '        clearTimeout(timer);',
            '        timer = setTimeout(() => fn(...args), wait);',
            '    };',
            '}',
        ],
        [
            'const counts = {};',
            'for (const word of text.split(/\\s+/)) {',
            '    counts[word] = (counts[word] || 0) + 1;',
            '}',
        ],
        [
            'async function loadUser(id) {',
            '    const response = await fetch(`/api/users/${id}`);',
            '    if (!response.ok) throw new Error(response.statusText);',
            '    return response.json();',
            '}',
        ],
        [
            'const total = items',
            '    .filter((item) => item.inStock)',
            '    .map((item) => item.price * item.quantity)',
            '    .reduce((sum, value) => sum + value, 0);',
        ],
        [
            'class Stack {',
            '    #items = [];',
            '    push(item) {',
            '        this.#items.push(item);',
            '    }',
            '    pop() {',
            '        return this.#items.pop();',
            '    }',
            '}',
        ],
        [
            "document.querySelector('#save').addEventListener('click', (event) => {",
            '    event.preventDefault();',
            "    localStorage.setItem('draft', editor.value);",
            '});',
        ],
    ],
    python: [
        [
            'def fibonacci(n):',
            '    a, b = 0, 1',
            '    for _ in range(n):',
            '        a, b = b, a + b',
            '    return a',
        ],
        [
            'with open("data.csv", newline="") as handle:',
            '    for row in csv.DictReader(handle):',
            '        print(row["name"], row["email"])',
        ],
        [
            'class Point:',
            '    def __init__(self, x, y):',
            '        self.x = x',
            '        self.y = y',
            '',
            '    def __repr__(self):',
            '        return f"Point({self.x}, {self.y})"',
        ],
        [
            'squares = {n: n * n for n in range(10) if n % 2 == 0}',
            'for key, value in sorted(squares.items()):',
            '    print(f"{key}: {value}")',
        ],
        [
            'try:',
            '    port = int(os.environ.get("PORT", "8000"))',
            'except ValueError:',
            '    port = 8000',
        ],
        [
            'def read_lines(path):',
            '    with open(path) as handle:',
            '        for line in handle:',
            '            yield line.rstrip("\\n")',
        ],
    ],
    go: [
        [
            'func sum(values []int) int {',
            '    total := 0',
            '    for _, v := range values {',
            '        total += v',
            '    }',
            '    return total',
            '}',
        ],
        [
            'file, err := os.Open(path)',
            'if err != nil {',
            '    return err',
            '}',
            'defer file.Close()',
        ],
        [
            'type User struct {',
            '    ID    int    `json:"id"`',
            '    Name  string `json:"name"`',
            '    Email string `json:"email"`',
            '}',
        ],
        [
            'http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {',
            '    w.WriteHeader(http.StatusOK)',
            '    fmt.Fprintln(w, "ok")',
            '})',
        ],
        [
            'results := make(chan int)',
            'go func() {',
            '    defer close(results)',
            '    for i := 0; i < 3; i++ {',
            '        results <- i * i',
            '    }',
            '}()',
        ],
        [
            'switch day {',
            'case "Saturday", "Sunday":',
            '    fmt.Println("weekend")',
            'default:',
            '    fmt.Println("weekday")',
            '}',
        ],
    ],
    rust: [
        [
            'fn largest(values: &[i32]) -> Option<i32> {',
            '    let mut iter = values.iter();',
            '    let first = *iter.next()?;',
            '    Some(iter.fold(first, |max, &v| max.max(v)))',
            '}',
        ],
        ['#[derive(Debug, Clone, PartialEq)]', 'struct Point {', '    x: f64,', '    y: f64,', '}'],
        [
            'match command.as_str() {',
            '    "start" => server.start(),',
            '    "stop" => server.stop(),',
            '    other => eprintln!("unknown command: {other}"),',
            '}',
        ],
        [
            'let words: Vec<&str> = text',
            '    .split_whitespace()',
            '    .filter(|w| w.len() > 3)',
            '    .collect();',
        ],
        [
            'impl Drop for Connection {',
            '    fn drop(&mut self) {',
            '        println!("closing {}", self.address);',
            '    }',
            '}',
        ],
        [
            'fn read_config(path: &str) -> std::io::Result<String> {',
            '    let contents = std::fs::read_to_string(path)?;',
            '    Ok(contents.trim().to_string())',
            '}',
        ],
    ],
    sql: [
        [
            'SELECT name, COUNT(*) AS orders',
            'FROM customers',
            'JOIN orders ON orders.customer_id = customers.id',
            'GROUP BY name',
            'ORDER BY orders DESC;',
        ],
        [
            'CREATE TABLE users (',
            '    id INTEGER PRIMARY KEY,',
            '    email TEXT NOT NULL UNIQUE,',
            '    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
            ');',
        ],
        [
            'UPDATE products',
            'SET price = price * 1.1',
            "WHERE category = 'books'",
            '  AND price < 20;',
        ],
        [
            'WITH recent AS (',
            '    SELECT * FROM events',
            "    WHERE created_at > NOW() - INTERVAL '7 days'",
            ')',
            'SELECT type, COUNT(*) FROM recent GROUP BY type;',
        ],
        [
            'INSERT INTO tags (name)',
            "VALUES ('rust'), ('go'), ('python')",
            'ON CONFLICT (name) DO NOTHING;',
        ],
        [
            'SELECT department, AVG(salary) AS average',
            'FROM employees',
            'GROUP BY department',
            'HAVING AVG(salary) > 50000;',
        ],
    ],
    shell: [
        ['for file in *.log; do', '    gzip "$file"', 'done'],
        ['if [ -z "$API_KEY" ]; then', '    echo "API_KEY is not set" >&2', '    exit 1', 'fi'],
        [
            'git checkout -b fix/login',
            'git add -A',
            'git commit -m "Fix login redirect"',
            'git push -u origin fix/login',
        ],
        ['find . -name "*.tmp" -mtime +7 -print0 |', '    xargs -0 rm -f'],
        [
            'count=0',
            'while read -r line; do',
            '    count=$((count + 1))',
            'done < input.txt',
            'echo "$count lines"',
        ],
        [
            'curl -s https://api.example.com/items |',
            "    jq -r '.items[] | .name' |",
            '    sort | uniq -c',
        ],
    ],
};
