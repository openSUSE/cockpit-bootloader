/*
 * This file is part of Cockpit.
 *
 * Copyright (C) 2017 Red Hat, Inc.
 *
 * Cockpit is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation; either version 2.1 of the License, or
 * (at your option) any later version.
 *
 * Cockpit is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with Cockpit; If not, see <http://www.gnu.org/licenses/>.
 */

import React, { useEffect, useState } from 'react';
import { Button, Content, ContentVariants, Flex, FlexItem, Page, PageSection, PageSectionVariants, PageSidebar, Stack, ToggleGroup, ToggleGroupItem } from '@patternfly/react-core';

import { WithDialogs } from 'dialogs';
import cockpit from 'cockpit';
import { superuser } from 'superuser';
import { fsinfo } from 'cockpit/fsinfo';
import { EmptyStatePanel } from 'cockpit-components-empty-state';
import { ExclamationCircleIcon } from '@patternfly/react-icons';

import { AdvancedValues } from './pages/advanced';
import { BootOptions } from './pages/boot_options';
import { KernelParameters } from './pages/kernel_params';
import { BootKitProvider, useBootKitContext } from './state/bootkit_provider';
import { Snapshots } from './pages/snapshots';

const _ = cockpit.gettext;

type Pages = "advanced" | "boot-options" | "kernel-params" | "snapshots" ;

const SelectedPage = ({ page }: { page: Pages }) => {
    switch (page) {
    case "advanced":
        return <AdvancedValues />;
    case "boot-options":
        return <BootOptions />;
    case "kernel-params":
        return <KernelParameters />;
    case "snapshots":
        return <Snapshots />;
    default:
        return null;
    }
};

const LoadingGrub = () => {
    return (
        <Stack>
            <EmptyStatePanel
                title={_("Loading Grub information")}
                icon={ExclamationCircleIcon}
                loading
            />
        </Stack>
    );
};

const GrubNotFound = () => {
    return (
        <Stack>
            <EmptyStatePanel
                title={ _("No grub bootloader found") }
                icon={ ExclamationCircleIcon }
                paragraph={
                    <Content component={ContentVariants.p}>
                        {_("Make sure you have grub installed and that /etc/default/grub exists")}
                    </Content>
                }
            />
        </Stack>
    );
};

const UpdatingGrub = () => {
    return (
        <Stack>
            <EmptyStatePanel
                title={_("Updating grub configuration")}
                icon={ExclamationCircleIcon}
                loading
            />
        </Stack>
    );
};

const AuthenticationError = () => {
    return (
        <Stack>
            <EmptyStatePanel
                title={ _("Authentication error") }
                icon={ ExclamationCircleIcon }
                paragraph={
                    <Content component={ContentVariants.p}>
                        {_("Administrative access is required.")}
                    </Content>
                }
            />
        </Stack>
    );
};

const GrubErrorArea = () => {
    const { state } = useBootKitContext();

    if (!state.error) {
        return null;
    }

    return (
        <PageSection variant={PageSectionVariants.default} className='grub-error-area'>
            <Flex align={ { default: 'alignLeft' } }>
                <div>
                    <h1>{_("Unexpected error from the bootkit service!")}</h1>
                    <br />
                    <pre>{state.error}</pre>
                </div>
            </Flex>
        </PageSection>
    );
};

const GrubConfigMismatch = () => {
    const { config } = useBootKitContext();

    if (!config.config_diff) {
        return null;
    }

    return (
        <PageSection variant={PageSectionVariants.default} className='grub-error-area'>
            <Flex align={ { default: 'alignLeft' } }>
                <div>
                    <h1>{_("Grub2 config doesn't match the selected snapshot.")}</h1>
                    <p>{_("This is caused by manual configuration changes.")}</p>
                    <br />
                    <h3>{_("Chanes made to grub config")}</h3>
                    <pre>{config.config_diff}</pre>
                </div>
            </Flex>
        </PageSection>
    );
};

// Hack to hide the Sidebar area in patternfly 6 Page
const emptySidebar = <PageSidebar isSidebarOpen={false} />;

const ApplicationInner = () => {
    const [page, setPage] = React.useState<Pages>("kernel-params");
    const [hasGrub, setHasGrub] = useState<boolean | undefined>(undefined);
    const [authenticated, setAuthenticated] = React.useState(superuser.allowed);
    const context = useBootKitContext();

    useEffect(() => {
        fsinfo('/etc/default/grub', [])
                        .then(() => setHasGrub(true))
                        .catch(() => setHasGrub(false));

        superuser.addEventListener("changed", () => { setAuthenticated(superuser.allowed) });
    }, []);

    if (!authenticated) {
        return <AuthenticationError />;
    }

    if (!context.serviceAvailable) {
        return (
            <EmptyStatePanel
                icon={ ExclamationCircleIcon }
                title={ _("Booloader service (bootkit) is not active") }
                action={_("Troubleshoot")}
                actionVariant="link"
                onAction={() => cockpit.jump("/system/services")}
            />
        );
    }

    if (context.state.loading) {
        return <LoadingGrub />;
    }

    if (hasGrub === false) {
        return <GrubNotFound />;
    }

    if (context.state.saving) {
        return <UpdatingGrub />;
    }

    return (
        <WithDialogs>
            <Page sidebar={emptySidebar} className='no-masthead-sidebar'>
                <GrubErrorArea />
                <GrubConfigMismatch />
                <PageSection variant={PageSectionVariants.default}>
                    <Flex>
                        <FlexItem align={{ default: 'alignLeft' }}>
                            <ToggleGroup>
                                <ToggleGroupItem
                                    isSelected={page === "kernel-params"}
                                    buttonId="KernelParams"
                                    text={_("Kernel Parameters")}
                                    onChange={() => setPage("kernel-params")}
                                />
                                <ToggleGroupItem
                                    isSelected={page === "boot-options"}
                                    buttonId="BootOptions"
                                    text={_("Boot Options")}
                                    onChange={() => setPage("boot-options")}
                                />
                                <ToggleGroupItem
                                    isSelected={page === "advanced"}
                                    buttonId="Advanced"
                                    text={_("Advanced")}
                                    onChange={() => setPage("advanced")}
                                />
                                <ToggleGroupItem
                                    isSelected={page === "snapshots"}
                                    buttonId="Snapshots"
                                    text={_("Snapshots")}
                                    onChange={() => setPage("snapshots")}
                                />
                            </ToggleGroup>
                        </FlexItem>
                        <FlexItem align={{ default: 'alignRight' }}>
                            <Button variant="primary" onClick={() => context.saveConfig()}>
                                {_("Save")}
                            </Button>
                            <Button variant="secondary" onClick={() => context.resetConfig()}>
                                {_("Reset")}
                            </Button>
                        </FlexItem>
                    </Flex>
                </PageSection>
                <SelectedPage page={page} />
            </Page>
        </WithDialogs>
    );
};

export const Application = () => {
    return (
        <BootKitProvider>
            <ApplicationInner />
        </BootKitProvider>
    );
};
