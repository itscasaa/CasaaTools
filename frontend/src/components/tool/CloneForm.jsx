import React from 'react'
import UrlInputCard from '../landing/UrlInputCard'

export default function CloneForm({ onSubmit, loading, error, errorCode }) {
  return (
    <div className="w-full">
      <UrlInputCard onSubmit={onSubmit} loading={loading} apiError={error} apiErrorCode={errorCode} />
    </div>
  )
}