# A simple get query for DataEgressRecord based on releaseKey

with 

  allRelatedEgressRecords := (
    select release::DataEgressRecord
    filter 
        .release.releaseKey = <str>$releaseKey
    order by
        .occurredDateTime desc
  )

select {

  total := count(allRelatedEgressRecords),
  data := (
      select allRelatedEgressRecords {
        auditId,
        occurredDateTime,
        description,

        sourceIpAddress,
        sourceLocation,
        egressBytes,

        fileUrl,
        fileSize,
      }
      offset
        <int16>$offset
      limit
        <int16>$limit
  )
}
