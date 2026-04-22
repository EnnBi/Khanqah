import React from 'react';
import { FilteredContentList } from '../../components/FilteredContentList';
export default function ClipsScreen() {
  return <FilteredContentList kicker="CLIPS" types={['clip']} />;
}
