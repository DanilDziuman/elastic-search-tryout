{ 
  bool: {
    should: released.map(range => (
      { 
        range: 
        { released: { 
          gte: range.split('/')[0], 
          lte: range.split('/')[1] } 
        } 
      }))
  } 
}