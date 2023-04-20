# A dataset summary query via edgeql.
# Ideally this query could be used for listing all datasets or for a filtered datasetUri
# 
# Explanation on how to use filtered or not filtered query:
# 1. All datasets query - Set `datasetUri` as empty `undefined` or empty set
# 2. Single dataset query - Set `datasetUri` accordingly

with

  userPermission := (
    select permission::User
    filter .id = <uuid>$userDbId
  ),

  isAllowedQuery := (
    userPermission.isAllowedRefreshDatasetIndex 
      or 
    userPermission.isAllowedOverallAdministratorView
  ),

  dataset := (
    select dataset::Dataset
    filter
      (
        .uri = <optional str>$datasetUri
          if
        (select exists ((<optional str>$datasetUri)))
          else
        true
      )
        and
      isAllowedQuery
  )

select {
  results := assert_distinct((
    select (
      for d in dataset
      union (
        with

          # Query all artifacts

          bclArtifact := (
            select lab::ArtifactBcl 
            filter 
              (
                (not .bclFile.isDeleted) or <bool>$includeDeletedFile
              )
                and
              .<artifacts[is dataset::DatasetSpecimen]
              .dataset
              .uri = d.uri
          ),

          fastqArtifact := (
            select lab::ArtifactFastqPair
            filter 
              (
                (not .forwardFile.isDeleted) or <bool>$includeDeletedFile
                  and
                (not .reverseFile.isDeleted) or <bool>$includeDeletedFile
              )
                and
              .<artifacts[is dataset::DatasetSpecimen]
              .dataset
              .uri = d.uri
          ),

          vcfArtifact := (
            select lab::ArtifactVcf
            filter 
              (
                (not .vcfFile.isDeleted) or <bool>$includeDeletedFile
                  and
                (not .tbiFile.isDeleted) or <bool>$includeDeletedFile
              )
                and
              .<artifacts[is dataset::DatasetSpecimen]
              .dataset
              .uri = d.uri
          ),

          bamArtifact := (
            select lab::ArtifactBam
            filter 
              (
                (not .bamFile.isDeleted) or <bool>$includeDeletedFile
                  and
                (not .baiFile.isDeleted) or <bool>$includeDeletedFile
              )
                and
              .<artifacts[is dataset::DatasetSpecimen]
              .dataset
              .uri = d.uri
          ),

          cramArtifact := (
            select lab::ArtifactCram
            filter 
              (
                (not .cramFile.isDeleted) or <bool>$includeDeletedFile
                  and
                (not .craiFile.isDeleted) or <bool>$includeDeletedFile
              )
                and
              .<artifacts[is dataset::DatasetSpecimen]
              .dataset
              .uri = d.uri
          ),


          bclCount := count(bclArtifact),
          fastqCount := count(fastqArtifact),
          vcfCount := count(vcfArtifact),
          bamCount := count(bamArtifact),
          cramCount := count(cramArtifact),

          totalArtifactCount := sum({
            bclCount,
            fastqCount,
            vcfCount,
            bamCount,
            cramCount,
          }),

          totalArtifactSize := sum({
            bclArtifact.bclFile.size,
            fastqArtifact.forwardFile.size,
            fastqArtifact.reverseFile.size,
            vcfArtifact.vcfFile.size,
            vcfArtifact.tbiFile.size,
            bamArtifact.bamFile.size,
            bamArtifact.baiFile.size,
            cramArtifact.cramFile.size,
            cramArtifact.craiFile.size,
          }),

          # List all type of artifacts
          artifactList := "",
          artifactList:= (select artifactList ++ "BCL " if bclCount > 0 else  artifactList ++ "" ),
          artifactList:= (select artifactList ++ "FASTQ " if fastqCount > 0 else  artifactList ++ "" ),
          artifactList:= (select artifactList ++ "VCF " if vcfCount > 0 else  artifactList ++ "" ),
          artifactList:= (select artifactList ++ "BAM " if bamCount > 0 else  artifactList ++ "" ),
          artifactList:= (select artifactList ++ "CRAM " if cramCount > 0 else  artifactList ++ "" ),
          

        select {
          uri := d.uri,
          description := d.description,
          updatedDateTime := d.updatedDateTime,
          isInConfig := d.isInConfig,

          cases := (
            select d.cases { 
              consent: { id },
              externalIdentifiers,
              patients: {
                sexAtBirth,
                consent : { id },
                externalIdentifiers,
              }
            }
          ),

          totalCaseCount := count(d.cases),
          totalPatientCount := count(d.cases.patients),
          totalSpecimenCount := count(d.cases.patients.specimens),

          bclCount := bclCount,
          fastqCount := fastqCount,
          vcfCount := vcfCount,
          bamCount := bamCount,
          cramCount := cramCount,

          artifactTypes := artifactList,
          
          totalArtifactCount := totalArtifactCount,
          totalArtifactSizeBytes := totalArtifactSize,
        }
      )
    )
    order by
        .isInConfig desc then 
        .updatedDateTime desc
    offset
        <int16>$offset
    limit
        <int16>$limit
  )),
  totalCount := count(dataset)
}