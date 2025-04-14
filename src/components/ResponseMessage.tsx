import React from 'react';
import styles from './ResponseMessage.module.css';

interface ResponseMessageProps {
  content: string;
  namespace?: string; 
}

const ResponseMessage: React.FC<ResponseMessageProps> = ({ content, namespace }) => {
  const formatBoldText = (text: string) => {
    const boldRegex = /\*\*(.*?)\*\*/g;
    
    const parts = text.split(boldRegex);
    
    if (parts.length === 1) {
      return text;
    }
    
    return parts.map((part, index) => {
      if (index % 2 === 0) {
        return part;
      } else {
        return <strong key={index}>{part}</strong>;
      }
    });
  };

  const formatResponse = (text: string) => {
    const paragraphs = text.split('\n\n');
    
    return paragraphs.map((paragraph, index) => {
      if (paragraph.trim().startsWith('- ')) {
        const listItems = paragraph.split('\n').filter(item => item.trim().startsWith('- '));
        return (
          <ul key={index} className={styles.list}>
            {listItems.map((item, i) => (
              <li key={i} className={styles.listItem}>
                {formatBoldText(item.replace(/^-\s/, ''))}
              </li>
            ))}
          </ul>
        );
      }
      
      // Check if the paragraph is a heading
      if (paragraph.startsWith('# ')) {
        return <h2 key={index} className={styles.heading}>{formatBoldText(paragraph.replace('# ', ''))}</h2>;
      }
      
      // Regular paragraph
      return <p key={index} className={styles.paragraph}>{formatBoldText(paragraph)}</p>;
    });
  };

  return (
    <div className={styles.responseContainer}>
      {namespace && (
        <div className={styles.namespaceIndicator}>
          Source: {namespace.charAt(0).toUpperCase() + namespace.slice(1)}
        </div>
      )}
      {formatResponse(content)}
    </div>
  );
};

export default ResponseMessage; 