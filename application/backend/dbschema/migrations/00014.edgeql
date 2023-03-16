CREATE MIGRATION m1aghgd364dy5j2vhjlsddmaqhvszdwsfzbcxnwuvwsikszbn4x34q
    ONTO m1l5uupghraajc57qflwe37pkra2ujtudh66mglzf537pwbx2bzgna
{
  ALTER TYPE audit::AuditEvent {
      DROP PROPERTY whoDisplayName;
      DROP PROPERTY whoId;
  };
  CREATE ABSTRACT TYPE audit::OwnedAuditEvent EXTENDING audit::AuditEvent {
      CREATE REQUIRED PROPERTY whoDisplayName -> std::str;
      CREATE REQUIRED PROPERTY whoId -> std::str;
  };
  ALTER TYPE audit::DataAccessAuditEvent {
      DROP EXTENDING audit::AuditEvent;
      EXTENDING audit::OwnedAuditEvent LAST;
  };
  ALTER TYPE audit::ReleaseAuditEvent {
      DROP EXTENDING audit::AuditEvent;
      EXTENDING audit::OwnedAuditEvent LAST;
  };
  CREATE TYPE audit::UserAuditEvent EXTENDING audit::OwnedAuditEvent;
  ALTER TYPE permission::User {
      CREATE MULTI LINK userAuditEvent -> audit::UserAuditEvent {
          ON TARGET DELETE RESTRICT;
      };
  };
  ALTER TYPE audit::UserAuditEvent {
      CREATE LINK user_ := (.<userAuditEvent[IS permission::User]);
  };
  ALTER TYPE release::Release {
      CREATE MULTI LINK participants := (.<releaseParticipant[IS permission::User]);
  };
};