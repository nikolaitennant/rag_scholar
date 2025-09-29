import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Citation } from '../../types';
import { MobileCitationGroup } from './MobileCitationGroup';

interface MobileCitationRendererProps {
  content: string;
  citations: Citation[];
  messageIndex: number;
}

export const MobileCitationRenderer: React.FC<MobileCitationRendererProps> = ({
  content,
  citations,
  messageIndex
}) => {

  // Process content and render citations inline
  const renderContentWithCitations = React.useMemo(() => {
    let processedText = content;

    // Handle multiple citation formats:
    // 1. [#n] format
    // 2. [CITE:n] format
    // 3. CITATION_n format (already processed by backend)

    const oldCitationRegex = /\[#(\d+)\]/g;
    const newCitationRegex = /\[CITE:(\d+)\]/g;
    const backendCitationRegex = /CITATION_(\d+)/g;

    // First, convert old [#n] format to [CITE:n] format
    processedText = processedText.replace(oldCitationRegex, '[CITE:$1]');

    // Find all citation placeholders in the text
    const allMatches: Array<{ match: string; citationId: string; index: number; endIndex: number }> = [];
    let match;

    // Find [CITE:n] format
    const citeRegex = /\[CITE:(\d+)\]/g;
    while ((match = citeRegex.exec(processedText)) !== null) {
      allMatches.push({
        match: match[0],
        citationId: match[1],
        index: match.index,
        endIndex: match.index + match[0].length
      });
    }

    // Find CITATION_n format (from backend)
    const citationRegex = /CITATION_(\d+)/g;
    while ((match = citationRegex.exec(processedText)) !== null) {
      allMatches.push({
        match: match[0],
        citationId: match[1],
        index: match.index,
        endIndex: match.index + match[0].length
      });
    }

    // Sort matches by position
    allMatches.sort((a, b) => a.index - b.index);

    if (allMatches.length === 0) {
      return [processedText];
    }

    // Group consecutive citations
    const citationGroups: Array<{
      citations: Citation[];
      citationNumbers: number[];
      startIndex: number;
      endIndex: number;
    }> = [];

    let currentGroup: typeof citationGroups[0] | null = null;

    allMatches.forEach((citationMatch) => {
      const citationId = citationMatch.citationId;
      const citationIndex = parseInt(citationId) - 1;
      const citation = citations[citationIndex];

      // Create fallback citation if needed
      const normalizedCitation: Citation = citation || {
        id: `fallback-${citationId}`,
        source: `Source ${citationId}`,
        page: undefined,
        line: undefined,
        preview: '',
        summary: '',
        confidence: 1.0,
        document_type: 'document',
        relevance_score: 0.5
      };

      // Group consecutive citations (within 3 characters - basically touching)
      if (currentGroup && citationMatch.index - currentGroup.endIndex <= 3) {
        currentGroup.citations.push(normalizedCitation);
        currentGroup.citationNumbers.push(parseInt(citationId));
        currentGroup.endIndex = citationMatch.endIndex;
      } else {
        currentGroup = {
          citations: [normalizedCitation],
          citationNumbers: [parseInt(citationId)],
          startIndex: citationMatch.index,
          endIndex: citationMatch.endIndex
        };
        citationGroups.push(currentGroup);
      }
    });

    // Post-process groups to consolidate same-document citations
    citationGroups.forEach(group => {
      if (group.citations.length <= 1) return;

      // Check if all citations are from the same document by looking at actual source names
      // If they all have real source names (not "Source N" fallbacks), find the most common one
      const realSources = group.citations
        .map(c => c.source)
        .filter(source => !source.match(/^Source \d+$/));

      if (realSources.length > 0) {
        // Find the most common real source name
        const sourceMap = new Map<string, number>();
        realSources.forEach(source => {
          const count = sourceMap.get(source) || 0;
          sourceMap.set(source, count + 1);
        });

        let mostCommonSource = '';
        let maxCount = 0;
        sourceMap.forEach((count, source) => {
          if (count > maxCount) {
            maxCount = count;
            mostCommonSource = source;
          }
        });

        // Update all citations in the group to use the same document name
        if (mostCommonSource) {
          group.citations.forEach(citation => {
            citation.source = mostCommonSource;
          });
        }
      }
    });

    // Build the final content with citation components
    const parts: Array<string | React.ReactNode> = [];
    let lastIndex = 0;

    citationGroups.forEach((group, groupIndex) => {
      // Check if the text after the citation starts with punctuation
      const textAfterCitation = processedText.slice(group.endIndex);
      const punctuationMatch = textAfterCitation.match(/^([.!?,:;])/);

      if (punctuationMatch) {
        // Move the punctuation to be attached to the last word before citation
        const punctuation = punctuationMatch[1];

        // Add text before citation WITH the punctuation moved to end
        if (group.startIndex > lastIndex) {
          let textPart = processedText.slice(lastIndex, group.startIndex);
          // Remove any trailing whitespace and add punctuation directly
          textPart = textPart.trimEnd() + punctuation;
          parts.push(textPart);
        } else {
          // No text before, just add the punctuation
          parts.push(punctuation);
        }

        // Add a space before the citation
        parts.push(' ');

        // Add citation group after the punctuation and space
        parts.push(
          <MobileCitationGroup
            key={`mobile-citation-group-${messageIndex}-${groupIndex}`}
            citations={group.citations}
            citationNumbers={group.citationNumbers}
            messageIndex={messageIndex}
            maxVisible={1}
          />
        );

        // Add paragraph break after citation
        parts.push(<br key={`br-after-citation-${messageIndex}-${groupIndex}`} />);
        parts.push(<br key={`br-after-citation-double-${messageIndex}-${groupIndex}`} />);

        // Update lastIndex to skip the punctuation we already processed
        lastIndex = group.endIndex + punctuation.length;
      } else {
        // No punctuation after citation, normal flow
        if (group.startIndex > lastIndex) {
          const textPart = processedText.slice(lastIndex, group.startIndex);
          parts.push(textPart);
        }

        parts.push(
          <MobileCitationGroup
            key={`mobile-citation-group-${messageIndex}-${groupIndex}`}
            citations={group.citations}
            citationNumbers={group.citationNumbers}
            messageIndex={messageIndex}
            maxVisible={1}
          />
        );

        // Add paragraph break after citation
        parts.push(<br key={`br-after-citation-${messageIndex}-${groupIndex}`} />);
        parts.push(<br key={`br-after-citation-double-${messageIndex}-${groupIndex}`} />);

        lastIndex = group.endIndex;
      }
    });

    // Add remaining text
    if (lastIndex < processedText.length) {
      const remainingText = processedText.slice(lastIndex);
      parts.push(remainingText);
    }

    return parts;
  }, [content, citations, messageIndex]);

  // Render with basic markdown support but without interfering with citations
  const renderMarkdown = (text: string) => {
    // Handle basic formatting inline without line breaks
    const processedText = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>');

    return (
      <span dangerouslySetInnerHTML={{ __html: processedText }} />
    );
  };

  return (
    <div className="mobile-citation-content">
      {renderContentWithCitations.map((part: string | React.ReactNode, index: number) => {
        if (typeof part === 'string') {
          return (
            <span key={index} className="inline">
              {renderMarkdown(part)}
            </span>
          );
        }
        return <span key={index} className="inline">{part}</span>;
      })}
    </div>
  );
};