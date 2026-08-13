import { useState } from 'react';

export default function Quiz({ question, options, correctIndex }) {
  const [selected, setSelected] = useState(null);

  const handleClick = (index) => {
    if (selected !== null) return;
    setSelected(index);
  };

  return (
    <div className="quiz">
      <div className="quiz-question">{question}</div>
      <ul className="quiz-options">
        {options.map((option, index) => {
          let className = 'quiz-option';
          if (selected !== null) {
            if (index === correctIndex) className += ' correct';
            else if (index === selected) className += ' wrong';
          }
          return (
            <li
              key={index}
              className={className}
              onClick={() => handleClick(index)}
            >
              {option}
            </li>
          );
        })}
      </ul>
      {selected !== null && (
        <div className="quiz-feedback">
          {selected === correctIndex ? '✓ Correct!' : '✗ Not quite — correct answer highlighted.'}
        </div>
      )}
    </div>
  );
}
