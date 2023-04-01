let test = 'now';

if (test === 'now') {
  test = new Date();
}

console.log(test.toISOString().slice(0, 10));