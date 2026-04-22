import React from 'react';
import { FilteredContentList } from '../../components/FilteredContentList';
export default function BooksScreen() {
  return <FilteredContentList kicker="BOOKS" types={['book']} />;
}
