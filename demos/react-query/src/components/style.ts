import { default as styled, keyframes } from "styled-components";

export const spinner = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

export const Loader = styled["span"]`
  border: 8px solid #f3f3f3; /* Light grey */
  border-top: 8px solid #3498db; /* Blue */
  border-radius: 50%;
  width: 1.7rem;
  height: 1.7rem;
  animation: ${spinner} 1s linear infinite;
`;

export const TodosContainer = styled.div`
  padding: 1rem;
  display: grid;
  grid-template-rows: 3rem;
`;

export const Header = styled.div`
  display: grid;
  grid-template-columns: max-content max-content;
  grid-template-rows: max-content;
  grid-gap: 1rem;
`;

export const H1 = styled.h1`
  font-size: 1.5rem;
`;

export const Refresh = styled.button`
  height: 100%;
  font-size: 1.5em;
  appearance: none;
  background: none;
  border: none;
  cursor: pointer;
  transition: transform 0.1s ease-in-out;

  &:hover {
    filter: brightness(1.2);
  }

  &:active {
    transform: scale(1.2);
    filter: brightness(0.8);
  }
`;

export const TodoContainer = styled.div`
  display: grid;
  grid-template-columns: max-content 1fr max-content;
  align-items: center;
  column-gap: 1ch;
`;
